import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateServiceDto, UpdateServiceDto } from './dto/services.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(options?: {
    category?: string;
    isActive?: boolean;
    search?: string;
  }) {
    const where: any = {};
    if (options?.category) where.category = options.category;
    if (options?.isActive !== undefined) where.isActive = options.isActive;
    if (options?.search) {
      where.OR = [
        { name: { contains: options.search } },
        { description: { contains: options.search } },
        { category: { contains: options.search } },
      ];
    }

    const services = await this.prisma.service.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    return services.map((s) => ({
      ...s,
      price: Number(s.price),
    }));
  }

  async getCategories() {
    const categories = await this.prisma.service.findMany({
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });
    return categories.map((c) => c.category);
  }

  async findOne(id: number) {
    const service = await this.prisma.service.findUnique({
      where: { id },
    });
    if (!service) throw new NotFoundException('Service not found');
    return {
      ...service,
      price: Number(service.price),
    };
  }

  async create(dto: CreateServiceDto, userId: number, ipAddress?: string) {
    const existing = await this.prisma.service.findFirst({
      where: { name: dto.name.trim() },
    });
    if (existing) {
      throw new BadRequestException('A service with this name already exists.');
    }

    const service = await this.prisma.service.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim(),
        category: dto.category.trim(),
        price: new Prisma.Decimal(dto.price),
        durationMinutes: dto.durationMinutes || 30,
        isActive: true,
      },
    });

    await this.auditService.logAction({
      userId,
      action: 'SERVICE_CREATED',
      entity: 'Service',
      entityId: String(service.id),
      description: `Created service: ${service.name} (KSh ${service.price}) in category ${service.category}`,
      ipAddress,
    });

    return {
      ...service,
      price: Number(service.price),
    };
  }

  async update(id: number, dto: UpdateServiceDto, userId: number, ipAddress?: string) {
    const existing = await this.findOne(id);

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined) data.description = dto.description.trim();
    if (dto.category !== undefined) data.category = dto.category.trim();
    if (dto.price !== undefined) data.price = new Prisma.Decimal(dto.price);
    if (dto.durationMinutes !== undefined) data.durationMinutes = dto.durationMinutes;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    const updated = await this.prisma.service.update({
      where: { id },
      data,
    });

    await this.auditService.logAction({
      userId,
      action: 'SERVICE_UPDATED',
      entity: 'Service',
      entityId: String(id),
      description: `Updated service ${updated.name}. Price: KSh ${existing.price} -> KSh ${updated.price}. Active: ${updated.isActive}`,
      metadata: dto,
      ipAddress,
    });

    return {
      ...updated,
      price: Number(updated.price),
    };
  }

  async toggleActive(id: number, userId: number, ipAddress?: string) {
    const service = await this.findOne(id);
    const updated = await this.prisma.service.update({
      where: { id },
      data: { isActive: !service.isActive },
    });

    await this.auditService.logAction({
      userId,
      action: updated.isActive ? 'SERVICE_ACTIVATED' : 'SERVICE_DEACTIVATED',
      entity: 'Service',
      entityId: String(id),
      description: `${updated.isActive ? 'Activated' : 'Deactivated'} service: ${updated.name}`,
      ipAddress,
    });

    return {
      ...updated,
      price: Number(updated.price),
    };
  }
}
