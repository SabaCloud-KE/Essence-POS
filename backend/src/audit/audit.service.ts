import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LogLevel } from '@prisma/client';

export interface CreateAuditLogDto {
  userId?: number;
  action: string;
  entity: string;
  entityId?: string;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
}

export interface CreateSystemLogDto {
  level: LogLevel;
  context: string;
  message: string;
  stackTrace?: string;
  metadata?: any;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async logAction(dto: CreateAuditLogDto) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          userId: dto.userId || null,
          action: dto.action,
          entity: dto.entity,
          entityId: dto.entityId ? String(dto.entityId) : null,
          description: dto.description,
          ipAddress: dto.ipAddress || null,
          userAgent: dto.userAgent || null,
          metadata: dto.metadata ? JSON.stringify(dto.metadata) : null,
        },
      });
    } catch (err: any) {
      this.logger.error(`Failed to record audit log: ${err.message}`);
    }
  }

  async logSystem(dto: CreateSystemLogDto) {
    try {
      return await this.prisma.systemLog.create({
        data: {
          level: dto.level,
          context: dto.context,
          message: dto.message,
          stackTrace: dto.stackTrace || null,
          metadata: dto.metadata ? JSON.stringify(dto.metadata) : null,
        },
      });
    } catch (err: any) {
      this.logger.error(`Failed to record system log: ${err.message}`);
    }
  }

  async getAuditLogs(query: {
    page?: number;
    limit?: number;
    userId?: number;
    action?: string;
    entity?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.userId) where.userId = Number(query.userId);
    if (query.action) where.action = query.action;
    if (query.entity) where.entity = query.entity;

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    if (query.search) {
      where.OR = [
        { description: { contains: query.search } },
        { action: { contains: query.search } },
        { entity: { contains: query.search } },
      ];
    }

    const [total, logs] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      }),
    ]);

    return {
      data: logs,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSystemLogs(query: {
    page?: number;
    limit?: number;
    level?: LogLevel;
    context?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.level) where.level = query.level;
    if (query.context) where.context = query.context;

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    if (query.search) {
      where.OR = [
        { message: { contains: query.search } },
        { context: { contains: query.search } },
      ];
    }

    const [total, logs] = await Promise.all([
      this.prisma.systemLog.count({ where }),
      this.prisma.systemLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: logs,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
