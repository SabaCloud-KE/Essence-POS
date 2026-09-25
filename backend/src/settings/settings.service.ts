import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ConfigService } from '@nestjs/config';
import { MpesaService } from '../payments/mpesa.service';
import { UpdateMpesaSettingsDto, TestMpesaStkDto } from './dto/mpesa-settings.dto';
import { UpdateSessionTimeoutDto } from './dto/session-timeout.dto';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
    private readonly mpesaService: MpesaService,
  ) {}

  async getAll() {
    const dbSettings = await this.prisma.systemSetting.findMany({
      orderBy: { key: 'asc' },
    });

    const mpesaConfig = await this.mpesaService.getMpesaConfig();
    const isConfigured = this.mpesaService.isConfigured(mpesaConfig);
    const sessionTimeout = await this.getSessionTimeoutConfig();

    return {
      environment: {
        mpesaEnvironment: mpesaConfig.environment,
        mpesaShortcode: mpesaConfig.shortCode,
        mpesaTransactionType: mpesaConfig.transactionType,
        mpesaCallbackUrl: mpesaConfig.callbackUrl,
        isConfigured,
        simulationMode: mpesaConfig.simulationMode,
        isProduction: mpesaConfig.isProduction,
        timezone: 'Africa/Nairobi (UTC+3)',
        currency: 'KSh (KES)',
        sessionTimeout,
      },
      settings: dbSettings.map((s) => ({
        key: s.key,
        value: s.isSecret ? (s.value ? '••••••••' : '') : s.value,
        isSecret: s.isSecret,
        updatedAt: s.updatedAt,
      })),
    };
  }

  async update(key: string, value: string, userId: number, ipAddress?: string) {
    const isSecret = ['MPESA_CONSUMER_KEY', 'MPESA_CONSUMER_SECRET', 'MPESA_PASSKEY', 'JWT_SECRET'].includes(key);

    const setting = await this.prisma.systemSetting.upsert({
      where: { key },
      update: { value, isSecret },
      create: { key, value, isSecret },
    });

    await this.auditService.logAction({
      userId,
      action: 'SETTING_UPDATED',
      entity: 'SystemSetting',
      entityId: key,
      description: `Updated configuration key: ${key}`,
      ipAddress,
    });

    return {
      key: setting.key,
      value: setting.isSecret ? '••••••••' : setting.value,
      isSecret: setting.isSecret,
    };
  }

  async getSessionTimeoutConfig() {
    try {
      const settings = await this.prisma.systemSetting.findMany({
        where: {
          key: {
            in: ['SESSION_TIMEOUT_ADMIN_MINUTES', 'SESSION_TIMEOUT_STAFF_MINUTES'],
          },
        },
      });

      const map = new Map<string, string>();
      for (const s of settings) {
        map.set(s.key, s.value);
      }

      const adminTimeout = parseInt(map.get('SESSION_TIMEOUT_ADMIN_MINUTES') || '', 10) || 30;
      const staffTimeout = parseInt(map.get('SESSION_TIMEOUT_STAFF_MINUTES') || '', 10) || 15;

      return {
        adminTimeoutMinutes: Math.max(1, Math.min(720, adminTimeout)),
        staffTimeoutMinutes: Math.max(1, Math.min(720, staffTimeout)),
        warningCountdownSeconds: 60,
      };
    } catch (err: any) {
      this.logger.warn(`Could not fetch session timeout settings: ${err.message}`);
      return {
        adminTimeoutMinutes: 30,
        staffTimeoutMinutes: 15,
        warningCountdownSeconds: 60,
      };
    }
  }

  async updateSessionTimeout(dto: UpdateSessionTimeoutDto, userId: number, ipAddress?: string) {
    const adminVal = String(Math.max(1, Math.min(720, dto.adminTimeoutMinutes)));
    const staffVal = String(Math.max(1, Math.min(720, dto.staffTimeoutMinutes)));

    await this.prisma.systemSetting.upsert({
      where: { key: 'SESSION_TIMEOUT_ADMIN_MINUTES' },
      update: { value: adminVal, isSecret: false },
      create: { key: 'SESSION_TIMEOUT_ADMIN_MINUTES', value: adminVal, isSecret: false },
    });

    await this.prisma.systemSetting.upsert({
      where: { key: 'SESSION_TIMEOUT_STAFF_MINUTES' },
      update: { value: staffVal, isSecret: false },
      create: { key: 'SESSION_TIMEOUT_STAFF_MINUTES', value: staffVal, isSecret: false },
    });

    await this.auditService.logAction({
      userId,
      action: 'SESSION_TIMEOUT_UPDATED',
      entity: 'SystemSetting',
      entityId: 'SESSION_TIMEOUT',
      description: `Updated session timeouts: Admin Dashboard = ${adminVal} min, Staff POS = ${staffVal} min`,
      ipAddress,
    });

    return this.getSessionTimeoutConfig();
  }

  async updateMpesaSettings(dto: UpdateMpesaSettingsDto, userId: number, ipAddress?: string) {
    const updates: Array<{ key: string; value: string; isSecret: boolean }> = [];

    if (dto.environment !== undefined) {
      updates.push({ key: 'MPESA_ENVIRONMENT', value: dto.environment, isSecret: false });
    }
    if (dto.shortcode !== undefined && dto.shortcode.trim() !== '') {
      updates.push({ key: 'MPESA_SHORTCODE', value: dto.shortcode.trim(), isSecret: false });
    }
    if (dto.transactionType !== undefined) {
      updates.push({ key: 'MPESA_TRANSACTION_TYPE', value: dto.transactionType, isSecret: false });
    }
    if (dto.passkey !== undefined && dto.passkey.trim() !== '') {
      updates.push({ key: 'MPESA_PASSKEY', value: dto.passkey.trim(), isSecret: true });
    }
    if (dto.consumerKey !== undefined && dto.consumerKey.trim() !== '') {
      updates.push({ key: 'MPESA_CONSUMER_KEY', value: dto.consumerKey.trim(), isSecret: true });
    }
    if (dto.consumerSecret !== undefined && dto.consumerSecret.trim() !== '') {
      updates.push({ key: 'MPESA_CONSUMER_SECRET', value: dto.consumerSecret.trim(), isSecret: true });
    }
    if (dto.callbackUrl !== undefined && dto.callbackUrl.trim() !== '') {
      updates.push({ key: 'MPESA_CALLBACK_URL', value: dto.callbackUrl.trim(), isSecret: false });
    }
    if (dto.simulationMode !== undefined) {
      updates.push({ key: 'MPESA_SIMULATION_MODE', value: String(dto.simulationMode), isSecret: false });
    }

    for (const item of updates) {
      await this.prisma.systemSetting.upsert({
        where: { key: item.key },
        update: { value: item.value, isSecret: item.isSecret },
        create: { key: item.key, value: item.value, isSecret: item.isSecret },
      });
    }

    await this.auditService.logAction({
      userId,
      action: 'MPESA_SETTINGS_UPDATED',
      entity: 'SystemSetting',
      entityId: 'MPESA_GATEWAY',
      description: `Updated M-Pesa Gateway parameters: ${updates.map((u) => u.key).join(', ')}`,
      ipAddress,
    });

    return this.getAll();
  }

  async testMpesaConnection() {
    return this.mpesaService.testConnection();
  }

  async testMpesaStk(dto: TestMpesaStkDto) {
    return this.mpesaService.sendTestStk(dto.phoneNumber, dto.amount || 1);
  }
}
