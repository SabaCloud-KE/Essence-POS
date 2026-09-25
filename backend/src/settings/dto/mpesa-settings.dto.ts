import { IsString, IsOptional, IsBoolean, IsIn } from 'class-validator';

export class UpdateMpesaSettingsDto {
  @IsOptional()
  @IsIn(['sandbox', 'production'])
  environment?: string;

  @IsOptional()
  @IsString()
  shortcode?: string;

  @IsOptional()
  @IsIn(['CustomerPayBillOnline', 'CustomerBuyGoodsOnline'])
  transactionType?: string;

  @IsOptional()
  @IsString()
  passkey?: string;

  @IsOptional()
  @IsString()
  consumerKey?: string;

  @IsOptional()
  @IsString()
  consumerSecret?: string;

  @IsOptional()
  @IsString()
  callbackUrl?: string;

  @IsOptional()
  @IsBoolean()
  simulationMode?: boolean;
}

export class TestMpesaStkDto {
  @IsString()
  phoneNumber: string;

  @IsOptional()
  amount?: number;
}
