import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SaleStatus, PaymentStatus } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import * as PDFDocument from 'pdfkit';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  subMonths,
  format,
} from 'date-fns';
import { Response } from 'express';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to parse date ranges (Today, Yesterday, This Week, This Month, Last Month, Custom)
   */
  private getDateRange(period?: string, startDate?: string, endDate?: string): { start: Date; end: Date } {
    const now = new Date();

    switch (period?.toLowerCase()) {
      case 'yesterday': {
        const y = subDays(now, 1);
        return { start: startOfDay(y), end: endOfDay(y) };
      }
      case 'this_week':
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'this_month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'last_month': {
        const lm = subMonths(now, 1);
        return { start: startOfMonth(lm), end: endOfMonth(lm) };
      }
      case 'custom':
        return {
          start: startDate ? new Date(startDate) : startOfDay(now),
          end: endDate ? new Date(endDate) : endOfDay(now),
        };
      case 'today':
      default:
        return { start: startOfDay(now), end: endOfDay(now) };
    }
  }

  /**
   * Comprehensive Dashboard Metrics with server-side aggregations
   */
  async getDashboardStats(period?: string, startDate?: string, endDate?: string) {
    const { start, end } = this.getDateRange(period, startDate, endDate);

    // Fetch successful sales in range
    const paidSales = await this.prisma.sale.findMany({
      where: {
        status: SaleStatus.PAID,
        createdAt: { gte: start, lte: end },
      },
      include: {
        items: true,
        user: { select: { id: true, name: true } },
      },
    });

    // Counts for payments
    const [successfulCount, failedCount, pendingCount] = await Promise.all([
      this.prisma.payment.count({
        where: {
          status: PaymentStatus.PAID,
          createdAt: { gte: start, lte: end },
        },
      }),
      this.prisma.payment.count({
        where: {
          status: { in: [PaymentStatus.FAILED, PaymentStatus.CANCELLED, PaymentStatus.TIMEOUT] },
          createdAt: { gte: start, lte: end },
        },
      }),
      this.prisma.payment.count({
        where: {
          status: PaymentStatus.PENDING,
          createdAt: { gte: start, lte: end },
        },
      }),
    ]);

    // Financial totals
    let totalRevenue = 0;
    let totalServicesSold = 0;
    const serviceSalesMap = new Map<string, { name: string; category: string; count: number; revenue: number }>();
    const staffSalesMap = new Map<string, { id: number; name: string; count: number; revenue: number }>();
    const timelineMap = new Map<string, number>();

    for (const sale of paidSales) {
      const saleTotal = Number(sale.totalAmount);
      totalRevenue += saleTotal;

      // Timeline aggregation by date (YYYY-MM-DD)
      const dayKey = format(sale.createdAt, 'yyyy-MM-dd');
      timelineMap.set(dayKey, (timelineMap.get(dayKey) || 0) + saleTotal);

      // Staff breakdown
      const staffKey = String(sale.userId);
      const staffData = staffSalesMap.get(staffKey) || {
        id: sale.userId,
        name: sale.user.name,
        count: 0,
        revenue: 0,
      };
      staffData.count += 1;
      staffData.revenue += saleTotal;
      staffSalesMap.set(staffKey, staffData);

      // Services sold breakdown
      for (const item of sale.items) {
        totalServicesSold += item.quantity;
        const itemRevenue = Number(item.subtotal);
        const servData = serviceSalesMap.get(item.serviceName) || {
          name: item.serviceName,
          category: 'Salon',
          count: 0,
          revenue: 0,
        };
        servData.count += item.quantity;
        servData.revenue += itemRevenue;
        serviceSalesMap.set(item.serviceName, servData);
      }
    }

    const averageTransaction = paidSales.length > 0 ? totalRevenue / paidSales.length : 0;

    // Sort top services by revenue
    const topServices = Array.from(serviceSalesMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    // Staff breakdown list
    const staffPerformance = Array.from(staffSalesMap.values()).sort(
      (a, b) => b.revenue - a.revenue,
    );

    // Timeline array
    const revenueTimeline = Array.from(timelineMap.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Recent transactions (up to 25 for scrollable dashboard list)
    const recentSales = await this.prisma.sale.findMany({
      take: 25,
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        user: { select: { name: true } },
        payments: { select: { mpesaReceiptNumber: true, status: true } },
      },
    });

    return {
      period: period || 'today',
      dateRange: { start, end },
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        successfulTransactions: successfulCount,
        failedPayments: failedCount,
        pendingPayments: pendingCount,
        averageTransaction: Math.round(averageTransaction * 100) / 100,
        servicesSold: totalServicesSold,
      },
      topServices,
      staffPerformance,
      revenueTimeline,
      recentSales: recentSales.map((s) => ({
        id: s.id,
        receiptNumber: s.receiptNumber,
        customerName: s.customerName,
        customerPhone: s.customerPhone,
        staff: s.user.name,
        amount: Number(s.totalAmount),
        status: s.status,
        mpesaReceipt: s.payments[0]?.mpesaReceiptNumber || 'N/A',
        createdAt: s.createdAt,
      })),
    };
  }

  /**
   * Export Sales & Financial Report to Excel (.xlsx)
   */
  async exportExcel(res: Response, query: { startDate?: string; endDate?: string; status?: SaleStatus }) {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    const sales = await this.prisma.sale.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        payments: true,
        user: { select: { name: true } },
      },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Essence Hair & Beauty Salon';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Sales Report');

    // Title & Header branding
    sheet.mergeCells('A1:H1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'ESSENCE HAIR & BEAUTY SALON - SALES & PAYMENT REPORT';
    titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1A1A1A' },
    };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 36;

    sheet.mergeCells('A2:H2');
    const subtitleCell = sheet.getCell('A2');
    subtitleCell.value = `Generated: ${format(new Date(), 'dd MMMM yyyy HH:mm:ss')} (Africa/Nairobi) | Records: ${sales.length}`;
    subtitleCell.font = { name: 'Calibri', size: 10, italic: true };
    subtitleCell.alignment = { horizontal: 'center' };
    sheet.getRow(2).height = 20;

    sheet.addRow([]); // Blank row

    // Table Column Headers
    const headers = [
      'Receipt No',
      'Date & Time',
      'Customer Phone',
      'Staff',
      'Services',
      'Amount (KSh)',
      'Payment Status',
      'M-Pesa Receipt',
    ];
    const headerRow = sheet.addRow(headers);
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF8A733E' }, // Salon Warm Gold
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    let totalRevenue = 0;

    for (const sale of sales) {
      const servicesStr = sale.items.map((i) => `${i.serviceName} (x${i.quantity})`).join(', ');
      const mpesaReceipt = sale.payments.find((p) => p.mpesaReceiptNumber)?.mpesaReceiptNumber || 'N/A';
      const amount = Number(sale.totalAmount);
      if (sale.status === SaleStatus.PAID) totalRevenue += amount;

      const row = sheet.addRow([
        sale.receiptNumber,
        format(sale.createdAt, 'yyyy-MM-dd HH:mm'),
        sale.customerPhone,
        sale.user.name,
        servicesStr,
        amount,
        sale.status,
        mpesaReceipt,
      ]);

      row.getCell(6).numFmt = '#,##0.00';
      row.getCell(6).alignment = { horizontal: 'right' };
      row.getCell(7).alignment = { horizontal: 'center' };

      row.eachCell((cell) => {
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        };
      });
    }

    // Total summary row
    sheet.addRow([]);
    const totalRow = sheet.addRow(['', '', '', '', 'TOTAL PAID REVENUE:', totalRevenue, '', '']);
    totalRow.height = 24;
    totalRow.getCell(5).font = { bold: true };
    totalRow.getCell(6).font = { bold: true };
    totalRow.getCell(6).numFmt = '#,##0.00';

    // Auto-fit column widths
    sheet.columns = [
      { width: 22 }, // Receipt
      { width: 20 }, // Date
      { width: 16 }, // Phone
      { width: 18 }, // Staff
      { width: 35 }, // Services
      { width: 16 }, // Amount
      { width: 16 }, // Status
      { width: 18 }, // M-Pesa Receipt
    ];

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Essence_Sales_Report_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`,
    );

    await workbook.xlsx.write(res);
    res.end();
  }

  /**
   * Export Sales Report as a Printable PDF Document
   */
  async exportPdf(res: Response, query: { startDate?: string; endDate?: string; status?: SaleStatus }) {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    const sales = await this.prisma.sale.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        items: true,
        payments: true,
        user: { select: { name: true } },
      },
    });

    const doc = new PDFDocument({ margin: 36, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Essence_Sales_Report_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`,
    );

    doc.pipe(res);

    // Header Branding
    doc
      .fontSize(18)
      .fillColor('#1A1A1A')
      .text('ESSENCE HAIR & BEAUTY SALON', { align: 'center', characterSpacing: 1.5 })
      .moveDown(0.2);

    doc
      .fontSize(11)
      .fillColor('#8A733E')
      .text('OFFICIAL FINANCIAL TRANSACTION & SALES REPORT', { align: 'center' })
      .moveDown(0.2);

    doc
      .fontSize(8)
      .fillColor('#666666')
      .text(`Generated on: ${format(new Date(), 'dd MMMM yyyy HH:mm')} | Currency: Kenyan Shillings (KSh)`, {
        align: 'center',
      })
      .moveDown(1.5);

    // Divider
    doc.moveTo(36, doc.y).lineTo(559, doc.y).strokeColor('#C5A059').lineWidth(1.5).stroke().moveDown(1);

    // Table Header
    const startY = doc.y;
    doc.rect(36, startY, 523, 20).fill('#F5EFE6');

    doc
      .fontSize(9)
      .fillColor('#1A1A1A')
      .font('Helvetica-Bold')
      .text('Receipt No', 42, startY + 5)
      .text('Date', 135, startY + 5)
      .text('Phone', 205, startY + 5)
      .text('Staff', 270, startY + 5)
      .text('Status', 340, startY + 5)
      .text('M-Pesa Ref', 400, startY + 5)
      .text('Amount (KSh)', 480, startY + 5, { align: 'right' });

    let currentY = startY + 24;
    let totalPaid = 0;

    doc.font('Helvetica').fontSize(8);

    for (const sale of sales) {
      if (currentY > 760) {
        doc.addPage();
        currentY = 40;
      }

      const mpesaRef = sale.payments[0]?.mpesaReceiptNumber || '-';
      const amount = Number(sale.totalAmount);
      if (sale.status === SaleStatus.PAID) totalPaid += amount;

      doc
        .fillColor('#222222')
        .text(sale.receiptNumber, 42, currentY)
        .text(format(sale.createdAt, 'dd/MM/yy HH:mm'), 135, currentY)
        .text(sale.customerPhone, 205, currentY)
        .text(sale.user.name.substring(0, 12), 270, currentY)
        .fillColor(sale.status === 'PAID' ? '#1b7a42' : '#992222')
        .text(sale.status, 340, currentY)
        .fillColor('#222222')
        .text(mpesaRef, 400, currentY)
        .text(amount.toLocaleString('en-KE', { minimumFractionDigits: 2 }), 480, currentY, { align: 'right' });

      currentY += 16;
    }

    doc.moveTo(36, currentY + 4).lineTo(559, currentY + 4).strokeColor('#D4AF37').lineWidth(1).stroke();

    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor('#1A1A1A')
      .text('TOTAL REVENUE (PAID):', 300, currentY + 12)
      .text(
        `KSh ${totalPaid.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`,
        450,
        currentY + 12,
        { align: 'right' },
      );

    doc.end();
  }

  /**
   * Generate Printable Digital Receipt PDF for a single completed sale
   */
  async generateReceiptPdf(saleId: number, res: Response) {
    const sale = await this.prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        items: true,
        payments: { where: { status: PaymentStatus.PAID } },
        user: { select: { name: true } },
      },
    });

    if (!sale) throw new NotFoundException('Sale not found.');

    const payment = sale.payments[0];

    // Thermal receipt style (80mm width = ~226pt)
    const doc = new PDFDocument({
      size: [226, 600],
      margin: 12,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename=Receipt_${sale.receiptNumber}.pdf`,
    );

    doc.pipe(res);

    // Salon branding header
    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .text('ESSENCE HAIR & BEAUTY', { align: 'center' })
      .fontSize(9)
      .text('SALON & SPA', { align: 'center' })
      .font('Helvetica')
      .fontSize(7)
      .text('Corner Plaza, Suite 4B, Nairobi, Kenya', { align: 'center' })
      .text('Tel: +254 700 123 456', { align: 'center' })
      .moveDown(0.5);

    doc.text('------------------------------------------------', { align: 'center' });

    doc
      .fontSize(8)
      .text(`Receipt No: ${sale.receiptNumber}`)
      .text(`Date: ${format(sale.createdAt, 'dd MMM yyyy')}`)
      .text(`Time: ${format(sale.createdAt, 'HH:mm')}`)
      .text(`Served By: ${sale.user.name}`)
      .text(`Customer: ${sale.customerPhone}`)
      .moveDown(0.5);

    doc.text('------------------------------------------------', { align: 'center' });

    // Itemized table
    doc.font('Helvetica-Bold').text('SERVICES', 12, doc.y);
    doc.moveDown(0.3);

    doc.font('Helvetica');
    for (const item of sale.items) {
      const lineTotal = Number(item.subtotal).toLocaleString('en-KE');
      doc.text(`${item.serviceName} x${item.quantity}`, 12, doc.y, { width: 140 });
      doc.text(`KSh ${lineTotal}`, 155, doc.y - 9, { align: 'right', width: 60 });
      doc.moveDown(0.3);
    }

    doc.text('------------------------------------------------', { align: 'center' });

    const total = Number(sale.totalAmount).toLocaleString('en-KE', { minimumFractionDigits: 2 });
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .text('TOTAL', 12, doc.y)
      .text(`KSh ${total}`, 130, doc.y - 12, { align: 'right', width: 85 })
      .moveDown(0.8);

    doc.font('Helvetica').fontSize(8);
    doc.text('Payment Method: M-PESA');
    if (payment?.mpesaReceiptNumber) {
      doc.text(`M-Pesa Receipt: ${payment.mpesaReceiptNumber}`);
    }
    doc.text(`Status: ${sale.status}`);
    doc.moveDown(1);

    doc
      .fontSize(7)
      .font('Helvetica-Oblique')
      .text('Thank you for choosing', { align: 'center' })
      .text('Essence Hair & Beauty Salon!', { align: 'center' })
      .text('We look forward to serving you again.', { align: 'center' });

    doc.end();
  }
}
