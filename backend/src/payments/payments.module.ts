import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { MpesaService } from './mpesa.service';
import { MpesaCallbackService } from './mpesa-callback.service';
import { MpesaCallbackController } from './mpesa-callback.controller';
import { PaymentSimulatorController } from './payment-simulator.controller';

@Module({
  controllers: [
    PaymentsController,
    MpesaCallbackController,
    PaymentSimulatorController,
  ],
  providers: [
    PaymentsService,
    MpesaService,
    MpesaCallbackService,
  ],
  exports: [PaymentsService, MpesaService, MpesaCallbackService],
})
export class PaymentsModule {}
