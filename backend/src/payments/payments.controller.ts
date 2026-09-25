import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { InitiateStkPushDto } from './dto/payment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { Request } from 'express';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('mpesa/stk-push')
  async initiateStkPush(
    @Body() dto: InitiateStkPushDto,
    @CurrentUser('id') userId: number,
    @Req() req: Request,
  ) {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    return this.paymentsService.initiateStkPush(dto, userId, ip);
  }

  @Get(':id')
  async getPayment(@Param('id', ParseIntPipe) id: number) {
    return this.paymentsService.getPayment(id);
  }

  @Get('checkout/:checkoutRequestId')
  async getByCheckout(@Param('checkoutRequestId') checkoutRequestId: string) {
    return this.paymentsService.getPaymentByCheckoutRequestId(checkoutRequestId);
  }

  @Post(':id/refund')
  @Roles(UserRole.ADMIN)
  async refundPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
    @CurrentUser('id') adminId: number,
    @Req() req: Request,
  ) {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    return this.paymentsService.refundPayment(id, reason || 'Customer request', adminId, ip);
  }
}
