import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { Response } from 'express';

@Controller('logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('audit/export-txt')
  async exportAuditLogsText(
    @Res() res: Response,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.auditService.exportAuditLogsText(res, { search, startDate, endDate });
  }

  @Get('audit')
  async getAuditLogs(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('userId') userId?: number,
    @Query('action') action?: string,
    @Query('entity') entity?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.auditService.getAuditLogs({
      page,
      limit,
      userId,
      action,
      entity,
      search,
      startDate,
      endDate,
    });
  }

  @Get('system')
  async getSystemLogs(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('level') level?: string,
    @Query('context') context?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('file') file?: string,
  ) {
    return this.auditService.getSystemLogs({
      page,
      limit,
      level,
      context,
      category,
      search,
      startDate,
      endDate,
      file,
    });
  }

  @Get('files')
  async getLogFiles() {
    return this.auditService.getLogFiles();
  }

  @Get('download-file')
  async downloadLogFile(
    @Res() res: Response,
    @Query('file') fileName: string,
  ) {
    return this.auditService.downloadLogFile(res, fileName);
  }
}
