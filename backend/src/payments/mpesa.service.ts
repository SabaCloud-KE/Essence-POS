import { Injectable, Logger, BadRequestException, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import { format } from 'date-fns';

export interface DarajaStkResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
  isSimulation?: boolean;
}

export interface MpesaResolvedConfig {
  environment: string;
  isProduction: boolean;
  baseUrl: string;
  consumerKey: string;
  consumerSecret: string;
  shortCode: string;
  passKey: string;
  callbackUrl: string;
  transactionType: string;
  simulationMode: boolean;
}

@Injectable()
export class MpesaService {
  private readonly logger = new Logger(MpesaService.name);

  private cachedToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(
    private readonly configService: ConfigService,
    @Optional() private readonly prisma?: PrismaService,
  ) {}

  /**
   * Dynamically loads M-Pesa configuration from database SystemSetting table first,
   * falling back to ConfigService (.env)
   */
  async getMpesaConfig(): Promise<MpesaResolvedConfig> {
    const map = new Map<string, string>();

    if (this.prisma) {
      try {
        const settings = await this.prisma.systemSetting.findMany({
          where: {
            key: {
              in: [
                'MPESA_ENVIRONMENT',
                'MPESA_CONSUMER_KEY',
                'MPESA_CONSUMER_SECRET',
                'MPESA_SHORTCODE',
                'MPESA_PASSKEY',
                'MPESA_CALLBACK_URL',
                'MPESA_TRANSACTION_TYPE',
                'MPESA_SIMULATION_MODE',
              ],
            },
          },
        });
        for (const s of settings) {
          if (s.value !== undefined && s.value !== null && s.value !== '') {
            map.set(s.key, s.value);
          }
        }
      } catch (err: any) {
        this.logger.warn(`Could not fetch settings from database: ${err.message}`);
      }
    }

    const env = map.get('MPESA_ENVIRONMENT') || this.configService.get<string>('MPESA_ENVIRONMENT') || 'sandbox';
    const consumerKey = (map.get('MPESA_CONSUMER_KEY') || this.configService.get<string>('MPESA_CONSUMER_KEY') || '').trim();
    const consumerSecret = (map.get('MPESA_CONSUMER_SECRET') || this.configService.get<string>('MPESA_CONSUMER_SECRET') || '').trim();
    const shortCode = (map.get('MPESA_SHORTCODE') || this.configService.get<string>('MPESA_SHORTCODE') || '174379').trim();
    const passKey = (
      map.get('MPESA_PASSKEY') ||
      this.configService.get<string>('MPESA_PASSKEY') ||
      'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919'
    ).trim();
    const callbackUrl = (
      map.get('MPESA_CALLBACK_URL') ||
      this.configService.get<string>('MPESA_CALLBACK_URL') ||
      'http://localhost:4000/api/payments/mpesa/callback'
    ).trim();
    const transactionType = (
      map.get('MPESA_TRANSACTION_TYPE') ||
      this.configService.get<string>('MPESA_TRANSACTION_TYPE') ||
      'CustomerPayBillOnline'
    ).trim();
    const simulationMode =
      (map.get('MPESA_SIMULATION_MODE') || this.configService.get<string>('MPESA_SIMULATION_MODE') || 'false').toLowerCase() === 'true';

    const isProduction = env.toLowerCase() === 'production';
    const baseUrl = isProduction
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';

    return {
      environment: env,
      isProduction,
      baseUrl,
      consumerKey,
      consumerSecret,
      shortCode,
      passKey,
      callbackUrl,
      transactionType,
      simulationMode,
    };
  }

  isConfigured(config: { consumerKey: string; consumerSecret: string }): boolean {
    return (
      Boolean(config.consumerKey) &&
      Boolean(config.consumerSecret) &&
      !config.consumerKey.includes('sandbox_daraja') &&
      !config.consumerKey.includes('your_') &&
      !config.consumerSecret.includes('sandbox_daraja') &&
      !config.consumerSecret.includes('your_')
    );
  }

  get isProduction(): boolean {
    return this.configService.get<string>('MPESA_ENVIRONMENT') === 'production';
  }

  get baseUrl(): string {
    return this.isProduction
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
  }

  get shortCode(): string {
    return this.configService.get<string>('MPESA_SHORTCODE') || '174379';
  }

  get passKey(): string {
    return (
      this.configService.get<string>('MPESA_PASSKEY') ||
      'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919'
    );
  }

  get callbackUrl(): string {
    return (
      this.configService.get<string>('MPESA_CALLBACK_URL') ||
      'http://localhost:4000/api/payments/mpesa/callback'
    );
  }

  /**
   * Sanitizes and validates a Kenyan mobile number into 254XXXXXXXXX format
   */
  formatPhoneNumber(phone: string): string {
    if (!phone) {
      throw new BadRequestException('Phone number is required.');
    }

    // Remove spaces, dashes, parentheses
    let cleaned = phone.replace(/[\s\-\(\)]/g, '');

    // Handle leading '+'
    if (cleaned.startsWith('+')) {
      cleaned = cleaned.substring(1);
    }

    // Handle leading '0' (e.g. 0712345678, 0112345678)
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.substring(1);
    }

    // Handle 9-digit format (e.g. 712345678 or 112345678)
    if ((cleaned.startsWith('7') || cleaned.startsWith('1')) && cleaned.length === 9) {
      cleaned = '254' + cleaned;
    }

    // Validate Kenyan format: 254 followed by 9 digits starting with 7 or 1
    const kenyaPhoneRegex = /^254[17]\d{8}$/;
    if (!kenyaPhoneRegex.test(cleaned)) {
      throw new BadRequestException(
        `Invalid Kenyan phone number "${phone}". Format must be Safaricom/M-Pesa valid (e.g., 0712345678 or 0110000000).`,
      );
    }

    return cleaned;
  }

  /**
   * Generate Daraja OAuth access token with automatic caching and live Safaricom verification
   */
  async getAccessToken(forceRefresh = false): Promise<string> {
    const now = Date.now();
    if (!forceRefresh && this.cachedToken && this.tokenExpiresAt > now + 60000) {
      return this.cachedToken;
    }

    const config = await this.getMpesaConfig();

    // If simulation mode is explicitly enabled, return simulator dummy token
    if (config.simulationMode) {
      this.logger.warn('M-Pesa running in Training Simulator Mode. STK push is simulated.');
      this.cachedToken = 'DEV_SIMULATOR_TOKEN_' + now;
      this.tokenExpiresAt = now + 3600 * 1000;
      return this.cachedToken;
    }

    // Check if credentials are configured
    if (!this.isConfigured(config)) {
      throw new BadRequestException(
        'Safaricom Daraja API credentials are not configured. To send live STK push prompts to customer handsets, configure your Consumer Key and Consumer Secret in Settings > M-Pesa Gateway, or switch to Simulator Mode for offline training.',
      );
    }

    try {
      const authHeader = Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64');
      const response = await axios.get(
        `${config.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
        {
          headers: {
            Authorization: `Basic ${authHeader}`,
          },
          timeout: 15000,
        },
      );

      const token = response.data?.access_token;
      if (!token) {
        throw new Error('Safaricom Daraja did not return an access token.');
      }
      const expiresIn = parseInt(response.data?.expires_in, 10) || 3599;

      this.cachedToken = token;
      this.tokenExpiresAt = now + expiresIn * 1000;
      return token;
    } catch (err: any) {
      const errData = err.response?.data;
      const errStatus = err.response?.status;
      const errMsg = errData?.errorMessage || errData?.message || err.message;
      this.logger.error(`Daraja OAuth token generation failed: [${errStatus}] ${errMsg}`, errData);

      if (errStatus === 401 || errStatus === 400) {
        throw new BadRequestException(
          `Safaricom Daraja Authentication Failed (${errStatus}): Invalid Consumer Key or Consumer Secret. Please check your credentials in Settings.`,
        );
      }
      throw new BadRequestException(
        `Unable to reach Safaricom Daraja Gateway (${config.baseUrl}): ${errMsg}. Please check network connectivity.`,
      );
    }
  }

  /**
   * Generate Base64 Daraja Password: Base64(Shortcode + Passkey + Timestamp)
   */
  generatePassword(timestamp: string, shortCode?: string, passKey?: string): string {
    const sc = shortCode || this.shortCode;
    const pk = passKey || this.passKey;
    const raw = `${sc}${pk}${timestamp}`;
    return Buffer.from(raw).toString('base64');
  }

  /**
   * Send STK Push request (Lipa Na M-Pesa Online)
   */
  async sendStkPush(params: {
    phoneNumber: string;
    amount: number;
    accountReference: string;
    transactionDesc: string;
  }): Promise<DarajaStkResponse> {
    const config = await this.getMpesaConfig();
    const formattedPhone = this.formatPhoneNumber(params.phoneNumber);
    const timestamp = format(new Date(), 'yyyyMMddHHmmss');
    const password = this.generatePassword(timestamp, config.shortCode, config.passKey);

    // If explicit simulation mode is enabled:
    if (config.simulationMode) {
      const mockCheckoutId = `ws_CO_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
      const mockMerchantId = `MER_${Date.now()}`;
      this.logger.log(`[Training Simulator] STK Push simulated for phone ${formattedPhone}, amount ${params.amount}`);
      return {
        MerchantRequestID: mockMerchantId,
        CheckoutRequestID: mockCheckoutId,
        ResponseCode: '0',
        ResponseDescription: 'Success. Request accepted for processing (Simulator Mode)',
        CustomerMessage: 'Success. Request accepted for processing (Simulator Mode)',
        isSimulation: true,
      };
    }

    const token = await this.getAccessToken();

    const payload = {
      BusinessShortCode: config.shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: config.transactionType || 'CustomerPayBillOnline',
      Amount: Math.max(1, Math.round(params.amount)),
      PartyA: formattedPhone,
      PartyB: config.shortCode,
      PhoneNumber: formattedPhone,
      CallBackURL: config.callbackUrl,
      AccountReference: params.accountReference.replace(/[^a-zA-Z0-9]/g, '').substring(0, 12) || 'SALON',
      TransactionDesc: (params.transactionDesc || 'Salon Services').substring(0, 13),
    };

    this.logger.log(
      `Dispatching STK Push via Safaricom (${config.baseUrl}) to ${formattedPhone}, amount KSh ${payload.Amount}, shortcode ${config.shortCode}`,
    );

    try {
      const response = await axios.post(
        `${config.baseUrl}/mpesa/stkpush/v1/processrequest`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 25000,
        },
      );

      const data = response.data;
      this.logger.log(
        `Safaricom STK Response for ${formattedPhone}: Code=${data.ResponseCode}, Desc=${data.ResponseDescription}, CheckoutID=${data.CheckoutRequestID}`,
      );

      if (data.ResponseCode !== '0') {
        throw new BadRequestException(
          `Safaricom rejected STK Push: ${data.ResponseDescription || data.CustomerMessage || 'Request declined by Daraja.'}`,
        );
      }

      return {
        MerchantRequestID: data.MerchantRequestID,
        CheckoutRequestID: data.CheckoutRequestID,
        ResponseCode: data.ResponseCode,
        ResponseDescription: data.ResponseDescription,
        CustomerMessage: data.CustomerMessage || 'Success. Request accepted for processing',
        isSimulation: false,
      };
    } catch (err: any) {
      this.logger.error('Daraja STK Push request failed:', err.response?.data || err.message);
      const errData = err.response?.data;
      const errMsg =
        errData?.errorMessage ||
        errData?.ResponseDescription ||
        err.message ||
        'Failed to communicate with Safaricom M-Pesa. Please verify the phone number and try again.';
      throw new BadRequestException(`Safaricom STK Push Error: ${errMsg}`);
    }
  }

  /**
   * Diagnostic test connection method to verify OAuth with Safaricom Daraja
   */
  async testConnection() {
    const config = await this.getMpesaConfig();
    const configured = this.isConfigured(config);

    if (config.simulationMode) {
      return {
        success: true,
        connected: true,
        simulationMode: true,
        environment: config.environment,
        shortCode: config.shortCode,
        message: 'Training Simulator Mode is active. Offline simulated STK will be used for testing.',
      };
    }

    if (!configured) {
      return {
        success: false,
        connected: false,
        simulationMode: false,
        environment: config.environment,
        shortCode: config.shortCode,
        error: 'Safaricom Consumer Key and Consumer Secret are not configured. Please enter your credentials in Settings.',
      };
    }

    try {
      this.cachedToken = null;
      await this.getAccessToken(true);

      return {
        success: true,
        connected: true,
        simulationMode: false,
        environment: config.environment,
        shortCode: config.shortCode,
        transactionType: config.transactionType,
        callbackUrl: config.callbackUrl,
        message: `Successfully connected to Safaricom ${config.isProduction ? 'Production' : 'Sandbox'} Daraja Gateway. OAuth handshake verified!`,
      };
    } catch (err: any) {
      return {
        success: false,
        connected: false,
        simulationMode: false,
        environment: config.environment,
        shortCode: config.shortCode,
        error: err.message || 'Failed to authenticate with Safaricom Daraja.',
      };
    }
  }

  /**
   * Sends a test STK Push of 1 KSh (or specified amount) to a phone number
   */
  async sendTestStk(phoneNumber: string, amount: number = 1) {
    const formatted = this.formatPhoneNumber(phoneNumber);
    const res = await this.sendStkPush({
      phoneNumber: formatted,
      amount: Math.max(1, Math.round(amount)),
      accountReference: 'TEST' + Date.now().toString().slice(-4),
      transactionDesc: 'Test STK Push',
    });
    return {
      success: true,
      phoneNumber: formatted,
      amount: Math.max(1, Math.round(amount)),
      ...res,
    };
  }

  /**
   * Query STK Push transaction status from Safaricom
   */
  async queryTransactionStatus(checkoutRequestId: string): Promise<any> {
    const config = await this.getMpesaConfig();
    const timestamp = format(new Date(), 'yyyyMMddHHmmss');
    const password = this.generatePassword(timestamp, config.shortCode, config.passKey);

    if (config.simulationMode) {
      return {
        ResponseCode: '0',
        ResponseDescription: 'The service request has been accepted successfully (Simulator)',
        ResultCode: '0',
        ResultDesc: 'The service request is processed successfully.',
      };
    }

    const token = await this.getAccessToken();

    try {
      const response = await axios.post(
        `${config.baseUrl}/mpesa/stkpushquery/v1/query`,
        {
          BusinessShortCode: config.shortCode,
          Password: password,
          Timestamp: timestamp,
          CheckoutRequestID: checkoutRequestId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        },
      );

      return response.data;
    } catch (err: any) {
      this.logger.error('Daraja status query error:', err.response?.data || err.message);
      throw new BadRequestException(
        err.response?.data?.errorMessage || 'Unable to query Safaricom transaction status.',
      );
    }
  }
}
