import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppLoggerService, LogCategory, LogLevel as AppLogLevel } from '../common/logger/app-logger.service';
import { LogLevel } from '@prisma/client';
import { Response } from 'express';
import { format } from 'date-fns';
import * as fs from 'fs';
import * as path from 'path';

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

  constructor(
    private readonly prisma: PrismaService,
    private readonly appLogger: AppLoggerService,
  ) {}

  /**
   * Log business audit trail to MySQL database AND write plain-text admin log
   */
  async logAction(dto: CreateAuditLogDto) {
    try {
      // 1. Write to server-local plain-text .log files
      this.appLogger.info('ADMIN', dto.description, {
        userId: dto.userId,
        action: dto.action,
        entity: dto.entity,
        entityId: dto.entityId,
        ipAddress: dto.ipAddress,
      });

      // 2. Persist to MySQL as source of truth for business audit records
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

  /**
   * Log system telemetry to database AND write plain-text system log
   */
  async logSystem(dto: CreateSystemLogDto) {
    try {
      // 1. Write to server-local plain-text .log files
      const cat = (['AUTH', 'PAYMENT', 'ADMIN', 'SYSTEM', 'DATABASE', 'API', 'SECURITY'].includes(dto.context)
        ? dto.context
        : 'SYSTEM') as LogCategory;
      const lvl = (['INFO', 'WARN', 'ERROR', 'DEBUG'].includes(dto.level)
        ? dto.level
        : 'INFO') as AppLogLevel;

      this.appLogger.log(lvl, cat, dto.message, dto.metadata, dto.stackTrace);

      // 2. Persist to MySQL SystemLog
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

    if (query.search && query.search.trim() && query.search !== 'undefined') {
      const s = query.search.trim();
      where.OR = [
        { description: { contains: s, mode: 'insensitive' } },
        { action: { contains: s, mode: 'insensitive' } },
        { entity: { contains: s, mode: 'insensitive' } },
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

  /**
   * Safely read technical system logs from server-local plain-text .log files
   */
  async getSystemLogs(query: {
    page?: number;
    limit?: number;
    level?: string;
    context?: string;
    category?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    file?: string;
  }) {
    // Read directly from server-local plain-text .log files
    const result = await this.appLogger.readLogs({
      page: query.page,
      limit: query.limit,
      level: query.level,
      context: query.context || query.category,
      category: query.category || query.context,
      search: query.search,
      startDate: query.startDate,
      endDate: query.endDate,
      file: query.file,
    });

    // If server file logs exist, return them
    if (result.data.length > 0 || result.meta.total > 0) {
      return result;
    }

    // Fallback to MySQL SystemLog table if file log is empty (e.g. fresh container)
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.level && query.level !== 'ALL') where.level = query.level as any;
    if (query.context && query.context !== 'ALL') where.context = query.context;

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    if (query.search && query.search.trim() && query.search !== 'undefined') {
      const s = query.search.trim();
      where.OR = [
        { message: { contains: s, mode: 'insensitive' } },
        { context: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [total, dbLogs] = await Promise.all([
      this.prisma.systemLog.count({ where }),
      this.prisma.systemLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: dbLogs,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Return metadata about available log files
   */
  getLogFiles() {
    return {
      files: this.appLogger.getAvailableLogFiles(),
    };
  }

  /**
   * Stream a plain-text log file for download with strict path-traversal prevention
   */
  downloadLogFile(res: Response, fileName: string) {
    if (!fileName || typeof fileName !== 'string') {
      throw new BadRequestException('Filename must be provided.');
    }

    // STRICT Path Traversal Validation: only allow alphanumeric, dashes, dots, ending with .log
    const isValid = /^(\d{4}-\d{2}-\d{2}-)?(application|authentication|payments|admin|errors)\.log$/.test(
      fileName,
    );
    if (!isValid || fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      throw new BadRequestException('Access denied: Invalid log filename.');
    }

    const logDir = path.resolve(process.cwd(), 'storage', 'logs');
    const safePath = path.join(logDir, fileName);

    if (!fs.existsSync(safePath)) {
      throw new NotFoundException(`Log file "${fileName}" not found on server.`);
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    const stream = fs.createReadStream(safePath);
    stream.pipe(res);
  }

  /**
   * Export audit trail directly as formatted plain text (.txt)
   */
  async exportAuditLogsText(
    res: Response,
    query: { search?: string; startDate?: string; endDate?: string },
  ) {
    const where: any = {};
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    if (query.search && query.search.trim() && query.search !== 'undefined') {
      const s = query.search.trim();
      where.OR = [
        { description: { contains: s, mode: 'insensitive' } },
        { action: { contains: s, mode: 'insensitive' } },
        { entity: { contains: s, mode: 'insensitive' } },
      ];
    }

    const logs = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 1000,
      include: {
        user: { select: { name: true, role: true, email: true } },
      },
    });

    let output = '';
    output += '================================================================================\n';
    output += 'ESSENCE HAIR & BEAUTY SALON - OFFICIAL AUDIT TRAIL LOG (PLAIN TEXT)\n';
    output += `Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')} (Africa/Nairobi) | Records: ${logs.length}\n`;
    output += 'Powered by SabaCloud (www.sabacloud.co.ke)\n';
    output += '================================================================================\n\n';

    for (const log of logs) {
      const time = format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss');
      const userName = log.user ? `${log.user.name} (${log.user.role} - ${log.user.email})` : 'System / Automated';
      output += `[${time}] [${log.action}] [User: ${userName}]\n`;
      output += `  Entity: ${log.entity}${log.entityId ? ` (#${log.entityId})` : ''}\n`;
      output += `  Description: ${log.description}\n`;
      if (log.ipAddress) output += `  IP Address: ${log.ipAddress}\n`;
      if (log.userAgent) output += `  User Agent: ${log.userAgent}\n`;
      if (log.metadata) {
        try {
          const parsed = JSON.parse(log.metadata);
          const metaLines = Object.entries(parsed)
            .map(([k, v]) => `    • ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
            .join('\n');
          output += `  Metadata:\n${metaLines}\n`;
        } catch {
          output += `  Metadata: ${log.metadata}\n`;
        }
      }
      output += '--------------------------------------------------------------------------------\n';
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Essence_Audit_Logs_${format(new Date(), 'yyyyMMdd_HHmm')}.txt`,
    );
    res.send(output);
  }
}
