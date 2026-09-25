import { Controller, Post, Body, BadRequestException, Logger } from '@nestjs/common';
import { MpesaCallbackService, SafaricomCallbackPayload } from './mpesa-callback.service';
import { SimulateCallbackDto } from './dto/payment.dto';
import { PrismaService } from '../prisma/prisma.service';
import { format } from 'date-fns';

@Controller('payments')
export class PaymentSimulatorController {
  private readonly logger = new Logger(PaymentSimulatorController.name);

  constructor(
    private readonly mpesaCallbackService: MpesaCallbackService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Developer / Sandbox Simulator for simulating Safaricom Daraja STK push callback
   * Exercises the exact webhook schema and database transaction pipeline
   */
  @Post('mpesa/simulate-callback')
  async simulateCallback(@Body() dto: SimulateCallbackDto) {
    this.logger.log(`Simulating Daraja callback for checkout: ${dto.checkoutRequestId}, ResultCode: ${dto.resultCode}`);

    const payment = await this.prisma.payment.findUnique({
      where: { checkoutRequestId: dto.checkoutRequestId },
      include: { sale: true },
    });

    if (!payment) {
      throw new BadRequestException(`No payment found with CheckoutRequestID: ${dto.checkoutRequestId}`);
    }

    const timestampStr = format(new Date(), 'yyyyMMddHHmmss');
    const receiptNum =
      dto.mpesaReceiptNumber ||
      `QJH${Math.floor(10000000 + Math.random() * 90000000)}`;

    let resultDesc = dto.resultDesc;
    if (!resultDesc) {
      if (dto.resultCode === 0) {
        resultDesc = 'The service request is processed successfully.';
      } else if (dto.resultCode === 1032) {
        resultDesc = 'Request cancelled by user';
      } else if (dto.resultCode === 1037) {
        resultDesc = 'DS timeout user cannot be reached';
      } else {
        resultDesc = 'The balance is insufficient for the transaction.';
      }
    }

    // Build the authentic Safaricom Daraja callback payload structure
    const darajaPayload: SafaricomCallbackPayload = {
      Body: {
        stkCallback: {
          MerchantRequestID: payment.merchantRequestId || 'MER_SIMULATED',
          CheckoutRequestID: payment.checkoutRequestId,
          ResultCode: dto.resultCode,
          ResultDesc: resultDesc,
          CallbackMetadata:
            dto.resultCode === 0
              ? {
                  Item: [
                    { Name: 'Amount', Value: Number(payment.amount) },
                    { Name: 'MpesaReceiptNumber', Value: receiptNum },
                    { Name: 'TransactionDate', Value: timestampStr },
                    { Name: 'PhoneNumber', Value: payment.phoneNumber },
                  ],
                }
              : undefined,
        },
      },
    };

    return this.mpesaCallbackService.processCallback(darajaPayload);
  }
}
