import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole, SaleStatus } from '@prisma/client';
import { Response } from 'express';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard-stats')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async getDashboardStats(
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getDashboardStats(period, startDate, endDate);
  }

  @Get('export/excel')
  @Roles(UserRole.ADMIN)
  async exportExcel(
    @Res() res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: SaleStatus,
  ) {
    return this.reportsService.exportExcel(res, { startDate, endDate, status });
  }

  @Get('export/pdf')
  @Roles(UserRole.ADMIN)
  async exportPdf(
    @Res() res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: SaleStatus,
  ) {
    return this.reportsService.exportPdf(res, { startDate, endDate, status });
  }

  @Get('receipt/pdf/:saleId')
  async getReceiptPdf(
    @Param('saleId', ParseIntPipe) saleId: number,
    @Res() res: Response,
  ) {
    return this.reportsService.generateReceiptPdf(saleId, res);
  }
}
