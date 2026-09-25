import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EventsGateway } from '../events/events.gateway';
import { PaymentStatus, SaleStatus, LogLevel } from '@prisma/client';

export interface SafaricomCallbackPayload {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: Array<{
          Name: string;
          Value: any;
        }>;
      };
    };
  };
}

@Injectable()
export class MpesaCallbackService {
  private readonly logger = new Logger(MpesaCallbackService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  /**
   * Process incoming Safaricom Daraja STK Push callback
   */
  async processCallback(payload: SafaricomCallbackPayload) {
    this.logger.log('Processing Safaricom Daraja Callback webhook...');

    const stkCallback = payload?.Body?.stkCallback;
    if (!stkCallback) {
      this.logger.error('Invalid callback payload: missing Body.stkCallback', payload);
      return { ResultCode: 1, ResultDesc: 'Invalid payload structure' };
    }

    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata,
    } = stkCallback;

    // 1. Locate the internal payment record
    const existingPayment = await this.prisma.payment.findUnique({
      where: { checkoutRequestId: CheckoutRequestID },
      include: { sale: true },
    });

    if (!existingPayment) {
      this.logger.warn(`No payment found matching CheckoutRequestID: ${CheckoutRequestID}`);
      await this.auditService.logSystem({
        level: LogLevel.WARNING,
        context: 'MPESA_CALLBACK',
        message: `Callback received for unrecognized CheckoutRequestID: ${CheckoutRequestID}`,
        metadata: { payload },
      });
      return { ResultCode: 0, ResultDesc: 'Accepted but unrecognized' };
    }

    // 2. Idempotency check: If already finalized, do not duplicate
    if (existingPayment.status === PaymentStatus.PAID) {
      this.logger.log(
        `Idempotency triggered: Payment for ${CheckoutRequestID} already finalized as PAID. Skipping duplicate processing.`,
      );
      return { ResultCode: 0, ResultDesc: 'Transaction already successfully processed' };
    }

    // 3. Extract metadata fields if payment was successful
    let mpesaReceiptNumber: string | null = null;
    let transactionDate: Date | null = null;
    let paidAmount: number | null = null;
    let paidPhone: string | null = null;

    if (CallbackMetadata?.Item) {
      for (const item of CallbackMetadata.Item) {
        if (item.Name === 'MpesaReceiptNumber') mpesaReceiptNumber = String(item.Value);
        if (item.Name === 'Amount') paidAmount = Number(item.Value);
        if (item.Name === 'PhoneNumber') paidPhone = String(item.Value);
        if (item.Name === 'TransactionDate') {
          // Format from Safaricom: YYYYMMDDHHmmss
          const rawDateStr = String(item.Value);
          if (rawDateStr.length === 14) {
            const year = parseInt(rawDateStr.substring(0, 4), 10);
            const month = parseInt(rawDateStr.substring(4, 6), 10) - 1;
            const day = parseInt(rawDateStr.substring(6, 8), 10);
            const hour = parseInt(rawDateStr.substring(8, 10), 10);
            const min = parseInt(rawDateStr.substring(10, 12), 10);
            const sec = parseInt(rawDateStr.substring(12, 14), 10);
            transactionDate = new Date(Date.UTC(year, month, day, hour, min, sec));
          } else {
            transactionDate = new Date();
          }
        }
      }
    }

    // Determine payment status based on Safaricom ResultCode
    let paymentStatus: PaymentStatus = PaymentStatus.FAILED;
    if (ResultCode === 0) {
      paymentStatus = PaymentStatus.PAID;
    } else if (ResultCode === 1032) {
      paymentStatus = PaymentStatus.CANCELLED; // Cancelled by customer
    } else if (ResultCode === 1037) {
      paymentStatus = PaymentStatus.TIMEOUT; // Customer timeout / no PIN entered
    }

    // 4. Atomic database transaction: Update Payment + Sale + Ledger
    const result = await this.prisma.$transaction(async (tx) => {
      // If receipt number already recorded by another transaction, guard against collisions
      if (mpesaReceiptNumber) {
        const receiptExists = await tx.payment.findFirst({
          where: {
            mpesaReceiptNumber,
            id: { not: existingPayment.id },
          },
        });
        if (receiptExists) {
          this.logger.error(`Duplicate M-Pesa Receipt Number detected: ${mpesaReceiptNumber}`);
          throw new Error(`Receipt number ${mpesaReceiptNumber} is already associated with another transaction.`);
        }
      }

      // Update payment
      const updatedPayment = await tx.payment.update({
        where: { id: existingPayment.id },
        data: {
          status: paymentStatus,
          resultCode: Number(ResultCode),
          resultDescription: ResultDesc,
          mpesaReceiptNumber: mpesaReceiptNumber || null,
          transactionDate: transactionDate || new Date(),
          rawCallbackPayload: JSON.stringify(payload),
        },
      });

      // Update sale status if payment was successful
      let updatedSale = existingPayment.sale;
      if (paymentStatus === PaymentStatus.PAID) {
        updatedSale = await tx.sale.update({
          where: { id: existingPayment.saleId },
          data: {
            status: SaleStatus.PAID,
          },
        });
      }

      return { payment: updatedPayment, sale: updatedSale };
    });

    // 5. Create audit/system logs
    if (paymentStatus === PaymentStatus.PAID) {
      await this.auditService.logAction({
        action: 'PAYMENT_SUCCESS',
        entity: 'Payment',
        entityId: String(result.payment.id),
        description: `M-Pesa payment of KSh ${result.payment.amount} confirmed. Receipt: ${result.payment.mpesaReceiptNumber}`,
        metadata: {
          saleId: result.sale.id,
          receiptNumber: result.sale.receiptNumber,
          mpesaReceiptNumber: result.payment.mpesaReceiptNumber,
          amount: Number(result.payment.amount),
        },
      });
    } else {
      await this.auditService.logSystem({
        level: LogLevel.PAYMENT,
        context: 'MPESA_CALLBACK',
        message: `M-Pesa payment ${paymentStatus} for Sale ${existingPayment.sale.receiptNumber}: ${ResultDesc} (Code: ${ResultCode})`,
        metadata: {
          saleId: existingPayment.saleId,
          checkoutRequestId: CheckoutRequestID,
          resultCode: ResultCode,
        },
      });
    }

    // 6. Broadcast real-time update to POS register and Admin dashboard via WebSocket
    this.eventsGateway.emitPaymentUpdate(existingPayment.saleId, {
      saleId: existingPayment.saleId,
      receiptNumber: existingPayment.sale.receiptNumber,
      paymentId: result.payment.id,
      status: result.payment.status,
      saleStatus: result.sale.status,
      mpesaReceiptNumber: result.payment.mpesaReceiptNumber,
      amount: Number(result.payment.amount),
      resultCode: result.payment.resultCode,
      resultDescription: result.payment.resultDescription,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      `Payment ${result.payment.id} processed successfully as ${result.payment.status}`,
    );

    return { ResultCode: 0, ResultDesc: 'Callback processed successfully' };
  }
}
