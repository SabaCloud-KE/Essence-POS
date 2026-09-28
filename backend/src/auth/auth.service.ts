import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AppLoggerService } from '../common/logger/app-logger.service';
import { LoginDto, VerifyMfaDto, ChangePasswordDto, ConfirmMfaSetupDto } from './dto/auth.dto';
import * as bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { LogLevel } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
    private readonly appLogger: AppLoggerService,
  ) {}

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user) {
      this.appLogger.warn('SECURITY', 'Failed login attempt - user not found', {
        email: dto.email.toLowerCase().trim(),
        ip: ipAddress,
      });

      await this.auditService.logSystem({
        level: LogLevel.SECURITY,
        context: 'AUTH_LOGIN',
        message: `Failed login attempt for nonexistent user: ${dto.email}`,
        metadata: { ipAddress, userAgent },
      });
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (!user.isActive) {
      this.appLogger.warn('SECURITY', 'Login attempt on deactivated account', {
        userId: user.id,
        email: user.email,
        ip: ipAddress,
      });
      throw new ForbiddenException('Your account has been deactivated. Please contact an administrator.');
    }

    // Check account lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / (1000 * 60));
      this.appLogger.warn('SECURITY', 'Blocked login attempt on locked account', {
        userId: user.id,
        email: user.email,
        ip: ipAddress,
        remainingMinutes,
      });

      await this.auditService.logSystem({
        level: LogLevel.SECURITY,
        context: 'AUTH_LOCKOUT',
        message: `Blocked login attempt on locked account: ${user.email}`,
        metadata: { ipAddress, remainingMinutes },
      });
      throw new ForbiddenException(
        `Account is temporarily locked due to multiple failed attempts. Please try again in ${remainingMinutes} minute(s).`,
      );
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      const failedLogins = user.failedLogins + 1;
      let lockedUntil: Date | null = null;

      if (failedLogins >= 5) {
        lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min lock
        this.appLogger.warn('SECURITY', 'Account locked out due to multiple failed login attempts', {
          userId: user.id,
          email: user.email,
          failedLogins,
          lockedUntil: lockedUntil.toISOString(),
          ip: ipAddress,
        });
      } else {
        this.appLogger.warn('SECURITY', `Failed login attempt (${failedLogins}/5)`, {
          userId: user.id,
          email: user.email,
          failedLogins,
          ip: ipAddress,
        });
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLogins, lockedUntil },
      });

      await this.auditService.logAction({
        userId: user.id,
        action: 'LOGIN_FAILED',
        entity: 'User',
        entityId: String(user.id),
        description: `Failed login attempt (${failedLogins}/5)`,
        ipAddress,
        userAgent,
      });

      throw new UnauthorizedException('Invalid email or password.');
    }

    // Reset failed logins on valid credentials
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLogins: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    // If MFA is enabled, generate a short-lived intermediate token
    if (user.mfaEnabled && user.mfaSecret) {
      const mfaToken = this.jwtService.sign(
        { sub: user.id, email: user.email, type: 'mfa_pending' },
        { expiresIn: '5m' },
      );

      this.appLogger.info('AUTH', 'MFA challenge issued awaiting OTP code', {
        userId: user.id,
        email: user.email,
      });

      await this.auditService.logAction({
        userId: user.id,
        action: 'MFA_CHALLENGE_ISSUED',
        entity: 'User',
        entityId: String(user.id),
        description: 'MFA challenge issued awaiting OTP code',
        ipAddress,
        userAgent,
      });

      return {
        requireMfa: true,
        mfaToken,
        message: 'Multi-Factor Authentication required. Please enter your 6-digit code.',
      };
    }

    // Direct login success
    const accessToken = this.generateToken(user);

    this.appLogger.info('AUTH', 'User logged in successfully', {
      userId: user.id,
      email: user.email,
      role: user.role,
      ip: ipAddress,
    });

    await this.auditService.logAction({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      entity: 'User',
      entityId: String(user.id),
      description: `User successfully logged in as ${user.role}`,
      ipAddress,
      userAgent,
    });

    return {
      requireMfa: false,
      accessToken,
      user: {
        id: user.id,
        uuid: user.uuid,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        mfaEnabled: user.mfaEnabled,
        mustChangePassword: user.mustChangePassword,
      },
    };
  }

  async verifyMfa(dto: VerifyMfaDto, ipAddress?: string, userAgent?: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(dto.mfaToken);
    } catch {
      this.appLogger.warn('SECURITY', 'MFA token expired or invalid', { ip: ipAddress });
      throw new UnauthorizedException('MFA session expired or invalid. Please log in again.');
    }

    if (payload.type !== 'mfa_pending') {
      this.appLogger.warn('SECURITY', 'Invalid MFA token payload type', { ip: ipAddress });
      throw new UnauthorizedException('Invalid MFA token.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive || !user.mfaSecret) {
      this.appLogger.warn('SECURITY', 'Invalid user state for MFA verification', {
        userId: payload.sub,
        ip: ipAddress,
      });
      throw new UnauthorizedException('Invalid user state for MFA verification.');
    }

    const isValid = authenticator.verify({
      token: dto.code.trim(),
      secret: user.mfaSecret,
    });

    if (!isValid) {
      this.appLogger.warn('SECURITY', 'Invalid MFA OTP code supplied', {
        userId: user.id,
        email: user.email,
        ip: ipAddress,
      });

      await this.auditService.logAction({
        userId: user.id,
        action: 'MFA_FAILED',
        entity: 'User',
        entityId: String(user.id),
        description: 'Invalid 6-digit MFA code supplied',
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedException('Invalid 6-digit authentication code.');
    }

    const accessToken = this.generateToken(user);

    this.appLogger.info('AUTH', 'MFA verified successfully; user session started', {
      userId: user.id,
      email: user.email,
      role: user.role,
      ip: ipAddress,
    });

    await this.auditService.logAction({
      userId: user.id,
      action: 'MFA_LOGIN_SUCCESS',
      entity: 'User',
      entityId: String(user.id),
      description: 'MFA successfully verified; session started',
      ipAddress,
      userAgent,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        uuid: user.uuid,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        mfaEnabled: user.mfaEnabled,
        mustChangePassword: user.mustChangePassword,
      },
    };
  }

  async generateMfaSetup(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(
      user.email,
      'Essence Hair & Beauty Salon',
      secret,
    );

    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    return {
      secret,
      qrCodeDataUrl,
    };
  }

  async confirmMfaSetup(userId: number, dto: ConfirmMfaSetupDto, ipAddress?: string) {
    const isValid = authenticator.verify({
      token: dto.code.trim(),
      secret: dto.secret,
    });

    if (!isValid) {
      this.appLogger.warn('SECURITY', 'Failed MFA setup confirmation - code mismatch', {
        userId,
        ip: ipAddress,
      });
      throw new BadRequestException('Invalid authentication code. Could not verify authenticator app.');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: true,
        mfaSecret: dto.secret,
      },
    });

    this.appLogger.info('AUTH', 'User enabled Multi-Factor Authentication', {
      userId,
      ip: ipAddress,
    });

    await this.auditService.logAction({
      userId,
      action: 'MFA_SETUP_ENABLED',
      entity: 'User',
      entityId: String(userId),
      description: 'User successfully enabled TOTP Two-Factor Authentication',
      ipAddress,
    });

    return { success: true, message: 'Two-Factor Authentication is now enabled.' };
  }

  async disableMfa(userId: number, ipAddress?: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
      },
    });

    this.appLogger.warn('SECURITY', 'User disabled Multi-Factor Authentication', {
      userId,
      ip: ipAddress,
    });

    await this.auditService.logAction({
      userId,
      action: 'MFA_DISABLED',
      entity: 'User',
      entityId: String(userId),
      description: 'User disabled TOTP Two-Factor Authentication',
      ipAddress,
    });

    return { success: true, message: 'Two-Factor Authentication has been disabled.' };
  }

  async changePassword(userId: number, dto: ChangePasswordDto, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    const isCurrentValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      this.appLogger.warn('SECURITY', 'Password change failed: current password incorrect', {
        userId,
        ip: ipAddress,
      });
      throw new BadRequestException('Current password does not match.');
    }

    const newHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
      },
    });

    this.appLogger.info('AUTH', 'User password changed successfully', {
      userId,
      ip: ipAddress,
    });

    await this.auditService.logAction({
      userId,
      action: 'PASSWORD_CHANGED',
      entity: 'User',
      entityId: String(userId),
      description: 'User changed their password',
      ipAddress,
    });

    return { success: true, message: 'Password updated successfully.' };
  }

  private generateToken(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    return this.jwtService.sign(payload);
  }

  async getSessionConfig() {
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
    } catch {
      return {
        adminTimeoutMinutes: 30,
        staffTimeoutMinutes: 15,
        warningCountdownSeconds: 60,
      };
    }
  }
}
