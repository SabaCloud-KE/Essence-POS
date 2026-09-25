import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class InitiateStkPushDto {
  @IsNumber()
  @IsPositive()
  saleId: number;

  @IsString()
  @IsNotEmpty({ message: 'Customer phone number is required.' })
  phoneNumber: string;
}

export class QueryPaymentStatusDto {
  @IsString()
  @IsNotEmpty()
  checkoutRequestId: string;
}

export class SimulateCallbackDto {
  @IsString()
  @IsNotEmpty()
  checkoutRequestId: string;

  @IsNumber()
  resultCode: number; // 0 for success, 1032 for cancelled by user, 1037 for timeout

  @IsOptional()
  @IsString()
  resultDesc?: string;

  @IsOptional()
  @IsString()
  mpesaReceiptNumber?: string;
}
