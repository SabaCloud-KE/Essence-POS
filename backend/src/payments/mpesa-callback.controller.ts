import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { MpesaCallbackService, SafaricomCallbackPayload } from './mpesa-callback.service';

@Controller('payments')
export class MpesaCallbackController {
  private readonly logger = new Logger(MpesaCallbackController.name);

  constructor(private readonly mpesaCallbackService: MpesaCallbackService) {}

  /**
   * Public Webhook callback endpoint registered with Safaricom Daraja
   */
  @Post('mpesa/callback')
  @HttpCode(HttpStatus.OK)
  async handleCallback(@Body() payload: SafaricomCallbackPayload) {
    this.logger.log('Incoming Safaricom Daraja STK Push callback received');
    return this.mpesaCallbackService.processCallback(payload);
  }
}
