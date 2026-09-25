import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MpesaService } from './mpesa.service';
import { EventsGateway } from '../events/events.gateway';
import { InitiateStkPushDto } from './dto/payment.dto';
import { PaymentMethod, PaymentStatus, SaleStatus, LogLevel, Prisma } from '@prisma/client';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly mpesaService: MpesaService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  /**
   * Initiate M-Pesa STK Push for a sale
   */
  async initiateStkPush(dto: InitiateStkPushDto, userId: number, ipAddress?: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id: dto.saleId },
      include: {
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!sale) {
      throw new NotFoundException('Sale not found.');
    }

    if (sale.status === SaleStatus.PAID) {
      throw new BadRequestException('This sale has already been paid for.');
    }

    if (sale.status === SaleStatus.CANCELLED) {
      throw new BadRequestException('Cannot initiate payment for a cancelled sale.');
    }

    // Format and validate phone
    const formattedPhone = this.mpesaService.formatPhoneNumber(dto.phoneNumber);

    // Daraja STK Push call
    const stkResponse = await this.mpesaService.sendStkPush({
      phoneNumber: formattedPhone,
      amount: Number(sale.totalAmount),
      accountReference: sale.receiptNumber,
      transactionDesc: `Sale ${sale.receiptNumber}`,
    });

    // Create Payment record with PENDING status
    const payment = await this.prisma.payment.create({
      data: {
        saleId: sale.id,
        amount: sale.totalAmount,
        phoneNumber: formattedPhone,
        paymentMethod: PaymentMethod.MPESA,
        status: PaymentStatus.PENDING,
        merchantRequestId: stkResponse.MerchantRequestID,
        checkoutRequestId: stkResponse.CheckoutRequestID,
      },
    });

    // Also update sale customerPhone if updated at checkout
    if (sale.customerPhone !== formattedPhone) {
      await this.prisma.sale.update({
        where: { id: sale.id },
        data: { customerPhone: formattedPhone },
      });
    }

    await this.auditService.logAction({
      userId,
      action: 'MPESA_STK_INITIATED',
      entity: 'Payment',
      entityId: String(payment.id),
      description: `Initiated M-Pesa STK Push for KSh ${sale.totalAmount} to phone ${formattedPhone} (Checkout: ${stkResponse.CheckoutRequestID})`,
      metadata: {
        saleId: sale.id,
        receiptNumber: sale.receiptNumber,
        checkoutRequestId: stkResponse.CheckoutRequestID,
      },
      ipAddress,
    });

    // Notify listeners that STK push was sent
    this.eventsGateway.emitPaymentUpdate(sale.id, {
      saleId: sale.id,
      receiptNumber: sale.receiptNumber,
      paymentId: payment.id,
      status: PaymentStatus.PENDING,
      checkoutRequestId: payment.checkoutRequestId,
      isSimulation: stkResponse.isSimulation || false,
      message: stkResponse.isSimulation
        ? 'STK Push simulated (Training Mode). Awaiting PIN simulation...'
        : 'STK Push sent to phone via Safaricom. Awaiting customer PIN...',
    });

    return {
      success: true,
      paymentId: payment.id,
      checkoutRequestId: payment.checkoutRequestId,
      customerMessage: stkResponse.CustomerMessage || 'Please check your phone and enter your M-Pesa PIN.',
      amount: Number(payment.amount),
      phoneNumber: formattedPhone,
      isSimulation: stkResponse.isSimulation || false,
    };
  }

  async getPayment(id: number) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        sale: {
          include: { items: true, user: true },
        },
      },
    });

    if (!payment) throw new NotFoundException('Payment not found.');

    return {
      ...payment,
      amount: Number(payment.amount),
      sale: {
        ...payment.sale,
        subtotal: Number(payment.sale.subtotal),
        discount: Number(payment.sale.discount),
        totalAmount: Number(payment.sale.totalAmount),
        items: payment.sale.items.map((i) => ({
          ...i,
          unitPrice: Number(i.unitPrice),
          subtotal: Number(i.subtotal),
        })),
      },
    };
  }

  async getPaymentByCheckoutRequestId(checkoutRequestId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { checkoutRequestId },
      include: {
        sale: {
          include: { items: true },
        },
      },
    });

    if (!payment) throw new NotFoundException('Payment not found.');

    return {
      ...payment,
      amount: Number(payment.amount),
    };
  }

  /**
   * Admin-only refund/reversal ledger action
   */
  async refundPayment(paymentId: number, reason: string, adminId: number, ipAddress?: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { sale: true },
    });

    if (!payment) throw new NotFoundException('Payment record not found.');
    if (payment.status !== PaymentStatus.PAID) {
      throw new BadRequestException('Only successfully completed PAID payments can be marked as refunded.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const p = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.REFUNDED,
          resultDescription: `Refunded by Admin. Reason: ${reason}`,
        },
      });

      await tx.sale.update({
        where: { id: payment.saleId },
        data: { status: SaleStatus.CANCELLED },
      });

      return p;
    });

    await this.auditService.logAction({
      userId: adminId,
      action: 'PAYMENT_REFUNDED',
      entity: 'Payment',
      entityId: String(paymentId),
      description: `Admin marked payment ${payment.mpesaReceiptNumber || payment.id} as REFUNDED. Reason: ${reason}`,
      metadata: { reason, amount: Number(payment.amount) },
      ipAddress,
    });

    return {
      success: true,
      message: 'Payment has been updated to REFUNDED and recorded in audit trail.',
      payment: {
        ...updated,
        amount: Number(updated.amount),
      },
    };
  }
}
