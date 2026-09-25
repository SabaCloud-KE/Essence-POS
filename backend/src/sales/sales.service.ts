import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateSaleDto } from './dto/sales.dto';
import { Prisma, SaleStatus, UserRole } from '@prisma/client';
import { format } from 'date-fns';

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async generateReceiptNumber(): Promise<string> {
    const today = format(new Date(), 'yyyyMMdd');
    const prefix = `ESS-${today}-`;

    const countToday = await this.prisma.sale.count({
      where: {
        receiptNumber: {
          startsWith: prefix,
        },
      },
    });

    const sequence = String(countToday + 1).padStart(5, '0');
    return `${prefix}${sequence}`;
  }

  async create(dto: CreateSaleDto, userId: number, ipAddress?: string) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('At least one salon service must be selected.');
    }

    // Fetch all requested services
    const serviceIds = dto.items.map((i) => i.serviceId);
    const services = await this.prisma.service.findMany({
      where: {
        id: { in: serviceIds },
      },
    });

    if (services.length !== serviceIds.length) {
      throw new BadRequestException('One or more selected services could not be found.');
    }

    const serviceMap = new Map<number, (typeof services)[0]>();
    for (const s of services) {
      if (!s.isActive) {
        throw new BadRequestException(`Service "${s.name}" is currently inactive.`);
      }
      serviceMap.set(s.id, s);
    }

    // Calculate subtotal and snapshot prices
    let subtotal = new Prisma.Decimal(0);
    const itemSnapshots = dto.items.map((item) => {
      const service = serviceMap.get(item.serviceId)!;
      const unitPrice = service.price;
      const itemSubtotal = unitPrice.mul(item.quantity);
      subtotal = subtotal.add(itemSubtotal);

      return {
        serviceId: service.id,
        serviceName: service.name,
        unitPrice,
        quantity: item.quantity,
        subtotal: itemSubtotal,
      };
    });

    const discount = new Prisma.Decimal(dto.discount || 0);
    if (discount.gt(subtotal)) {
      throw new BadRequestException('Discount amount cannot exceed total sale subtotal.');
    }

    const totalAmount = subtotal.sub(discount);
    if (totalAmount.lte(0)) {
      throw new BadRequestException('Total sale amount must be greater than zero.');
    }

    // Generate receipt number with collision safeguard
    let receiptNumber = await this.generateReceiptNumber();
    const existing = await this.prisma.sale.findUnique({ where: { receiptNumber } });
    if (existing) {
      receiptNumber = `${receiptNumber}-${Math.floor(100 + Math.random() * 900)}`;
    }

    // Create sale and items atomically
    const sale = await this.prisma.$transaction(async (tx) => {
      const created = await tx.sale.create({
        data: {
          receiptNumber,
          userId,
          customerPhone: dto.customerPhone.trim(),
          customerName: dto.customerName?.trim() || null,
          subtotal,
          discount,
          totalAmount,
          status: SaleStatus.PENDING,
          notes: dto.notes?.trim() || null,
          items: {
            create: itemSnapshots,
          },
        },
        include: {
          items: true,
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      });

      return created;
    });

    await this.auditService.logAction({
      userId,
      action: 'SALE_CREATED',
      entity: 'Sale',
      entityId: String(sale.id),
      description: `Created sale ${sale.receiptNumber} totaling KSh ${sale.totalAmount} for phone ${sale.customerPhone}`,
      metadata: { totalAmount: Number(sale.totalAmount), itemCount: sale.items.length },
      ipAddress,
    });

    return this.serializeSale(sale);
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    status?: SaleStatus;
    userId?: number;
    search?: string;
    startDate?: string;
    endDate?: string;
    userRole?: UserRole;
    currentUserId?: number;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    // If staff, restrict to their own sales unless admin
    if (query.userRole === UserRole.STAFF && query.currentUserId) {
      where.userId = query.currentUserId;
    } else if (query.userId) {
      where.userId = Number(query.userId);
    }

    if (query.status) where.status = query.status;

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    if (query.search) {
      where.OR = [
        { receiptNumber: { contains: query.search } },
        { customerPhone: { contains: query.search } },
        { customerName: { contains: query.search } },
        {
          payments: {
            some: {
              mpesaReceiptNumber: { contains: query.search },
            },
          },
        },
      ];
    }

    const [total, sales] = await Promise.all([
      this.prisma.sale.count({ where }),
      this.prisma.sale.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
          payments: {
            orderBy: { createdAt: 'desc' },
          },
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      }),
    ]);

    return {
      data: sales.map(this.serializeSale),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        items: true,
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        user: {
          select: { id: true, name: true, email: true, role: true, phone: true },
        },
      },
    });

    if (!sale) throw new NotFoundException('Sale record not found.');
    return this.serializeSale(sale);
  }

  async cancelSale(id: number, userId: number, ipAddress?: string) {
    const sale = await this.findOne(id);
    if (sale.status === SaleStatus.PAID) {
      throw new BadRequestException('Cannot cancel a completed sale with paid M-Pesa transaction.');
    }

    const updated = await this.prisma.sale.update({
      where: { id },
      data: { status: SaleStatus.CANCELLED },
      include: {
        items: true,
        payments: true,
        user: true,
      },
    });

    await this.auditService.logAction({
      userId,
      action: 'SALE_CANCELLED',
      entity: 'Sale',
      entityId: String(id),
      description: `Cancelled sale ${sale.receiptNumber}`,
      ipAddress,
    });

    return this.serializeSale(updated);
  }

  private serializeSale(sale: any) {
    return {
      ...sale,
      subtotal: Number(sale.subtotal),
      discount: Number(sale.discount),
      totalAmount: Number(sale.totalAmount),
      items: sale.items?.map((item: any) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        subtotal: Number(item.subtotal),
      })),
      payments: sale.payments?.map((payment: any) => ({
        ...payment,
        amount: Number(payment.amount),
      })),
    };
  }
}
