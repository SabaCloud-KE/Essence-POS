import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { UpdateMpesaSettingsDto, TestMpesaStkDto } from './dto/mpesa-settings.dto';
import { UpdateSessionTimeoutDto } from './dto/session-timeout.dto';

@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async getAll() {
    return this.settingsService.getAll();
  }

  @Patch(':key')
  async update(
    @Param('key') key: string,
    @Body('value') value: string,
    @CurrentUser('id') userId: number,
    @Req() req: Request,
  ) {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    return this.settingsService.update(key, value, userId, ip);
  }

  @Get('session-timeout')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async getSessionTimeout() {
    return this.settingsService.getSessionTimeoutConfig();
  }

  @Post('session-timeout')
  async updateSessionTimeout(
    @Body() dto: UpdateSessionTimeoutDto,
    @CurrentUser('id') userId: number,
    @Req() req: Request,
  ) {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    return this.settingsService.updateSessionTimeout(dto, userId, ip);
  }

  @Post('mpesa')
  async updateMpesa(
    @Body() dto: UpdateMpesaSettingsDto,
    @CurrentUser('id') userId: number,
    @Req() req: Request,
  ) {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    return this.settingsService.updateMpesaSettings(dto, userId, ip);
  }

  @Post('mpesa/test-connection')
  async testMpesaConnection() {
    return this.settingsService.testMpesaConnection();
  }

  @Post('mpesa/test-stk')
  async testMpesaStk(@Body() dto: TestMpesaStkDto) {
    return this.settingsService.testMpesaStk(dto);
  }
}
