import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateUserDto, UpdateUserDto, ResetUserPasswordDto } from './dto/users.dto';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';

export function generateTemporaryPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%&*';

  // Ensure at least one character from each set
  const parts = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ];

  const all = upper + lower + digits + symbols;
  for (let i = 0; i < 8; i++) {
    parts.push(all[Math.floor(Math.random() * all.length)]);
  }

  // Shuffle array
  return parts.sort(() => Math.random() - 0.5).join('');
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query: { page?: number; limit?: number; role?: UserRole; search?: string }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.role) where.role = query.role;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search } },
        { email: { contains: query.search } },
        { phone: { contains: query.search } },
      ];
    }

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          uuid: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          mfaEnabled: true,
          mustChangePassword: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    return {
      data: users,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        uuid: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        mfaEnabled: true,
        mustChangePassword: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(dto: CreateUserDto, actorId: number, ipAddress?: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (existing) {
      throw new BadRequestException('A user with this email address already exists.');
    }

    const plainPassword = dto.password?.trim() || generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email: dto.email.toLowerCase().trim(),
        phone: dto.phone?.trim() || null,
        role: dto.role,
        passwordHash,
        mustChangePassword: true,
      },
      select: {
        id: true,
        uuid: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        mustChangePassword: true,
        isActive: true,
        createdAt: true,
      },
    });

    await this.auditService.logAction({
      userId: actorId,
      action: 'USER_CREATED',
      entity: 'User',
      entityId: String(user.id),
      description: `Created user account for ${user.name} (${user.role}) with forced password reset on first login`,
      ipAddress,
    });

    return {
      ...user,
      temporaryPassword: plainPassword,
    };
  }

  async update(id: number, dto: UpdateUserDto, actorId: number, ipAddress?: string) {
    await this.findOne(id);

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.phone !== undefined) data.phone = dto.phone.trim();
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.isActive !== undefined) data.isActive = Boolean(dto.isActive);

    const updated = await this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        uuid: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        mustChangePassword: true,
        isActive: true,
        updatedAt: true,
      },
    });

    await this.auditService.logAction({
      userId: actorId,
      action: 'USER_UPDATED',
      entity: 'User',
      entityId: String(id),
      description: `Updated profile details for ${updated.name}`,
      metadata: dto,
      ipAddress,
    });

    return updated;
  }

  async resetPassword(id: number, dto: ResetUserPasswordDto, actorId: number, ipAddress?: string) {
    const user = await this.findOne(id);
    const passwordHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        mustChangePassword: true,
        failedLogins: 0,
        lockedUntil: null,
      },
    });

    await this.auditService.logAction({
      userId: actorId,
      action: 'USER_PASSWORD_RESET',
      entity: 'User',
      entityId: String(id),
      description: `Administrator reset password for user ${user.name} (flagged for change on next login)`,
      ipAddress,
    });

    return {
      success: true,
      message: `Password reset successfully for ${user.name}. They will be prompted to change it upon next login.`,
    };
  }
}
