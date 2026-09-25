import {
  Controller,
  Post,
  Body,
  Req,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, VerifyMfaDto, ChangePasswordDto, ConfirmMfaSetupDto } from './dto/auth.dto';
import { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const userAgent = req.headers['user-agent'];
    return this.authService.login(dto, ip, userAgent);
  }

  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  async verifyMfa(@Body() dto: VerifyMfaDto, @Req() req: Request) {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const userAgent = req.headers['user-agent'];
    return this.authService.verifyMfa(dto, ip, userAgent);
  }

  @Get('session-config')
  async getSessionConfig() {
    return this.authService.getSessionConfig();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: any) {
    return { user };
  }

  @Post('mfa/setup')
  @UseGuards(JwtAuthGuard)
  async setupMfa(@CurrentUser('id') userId: number) {
    return this.authService.generateMfaSetup(userId);
  }

  @Post('mfa/confirm')
  @UseGuards(JwtAuthGuard)
  async confirmMfa(
    @CurrentUser('id') userId: number,
    @Body() dto: ConfirmMfaSetupDto,
    @Req() req: Request,
  ) {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    return this.authService.confirmMfaSetup(userId, dto, ip);
  }

  @Post('mfa/disable')
  @UseGuards(JwtAuthGuard)
  async disableMfa(@CurrentUser('id') userId: number, @Req() req: Request) {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    return this.authService.disableMfa(userId, ip);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @CurrentUser('id') userId: number,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ) {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    return this.authService.changePassword(userId, dto, ip);
  }
}
