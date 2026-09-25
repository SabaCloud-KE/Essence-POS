import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { ServicesService } from './services.service';
import { CreateServiceDto, UpdateServiceDto } from './dto/services.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { Request } from 'express';

@Controller('services')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  async findAll(
    @Query('category') category?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
    @CurrentUser() user?: any,
  ) {
    // If staff, only return active services; admin can see inactive as well
    const filterActive =
      user.role === UserRole.ADMIN
        ? isActive !== undefined
          ? isActive === 'true'
          : undefined
        : true;

    return this.servicesService.findAll({
      category,
      isActive: filterActive,
      search,
    });
  }

  @Get('categories')
  async getCategories() {
    return this.servicesService.getCategories();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.servicesService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  async create(
    @Body() dto: CreateServiceDto,
    @CurrentUser('id') userId: number,
    @Req() req: Request,
  ) {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    return this.servicesService.create(dto, userId, ip);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateServiceDto,
    @CurrentUser('id') userId: number,
    @Req() req: Request,
  ) {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    return this.servicesService.update(id, dto, userId, ip);
  }

  @Patch(':id/toggle-active')
  @Roles(UserRole.ADMIN)
  async toggleActive(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @Req() req: Request,
  ) {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    return this.servicesService.toggleActive(id, userId, ip);
  }
}
