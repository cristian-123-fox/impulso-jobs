import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  ClientInfo,
  type ClientInfoPayload,
} from '@/common/decorators/client-info.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import type { AuthenticatedUser } from '@/common/types/authenticated-user';
import { LoginDto } from '@/modules/iam/auth/dto/login.dto';
import { RefreshTokenDto } from '@/modules/iam/auth/dto/refresh-token.dto';
import { LogoutDto } from '@/modules/iam/auth/dto/logout.dto';
import {
  LoginResponseDto,
  RefreshResponseDto,
} from '@/modules/iam/auth/dto/auth-response.dto';
import {
  LoginResult,
  LoginUseCase,
} from '@/modules/iam/auth/use-cases/login.use-case';
import {
  RefreshResult,
  RefreshTokenUseCase,
} from '@/modules/iam/auth/use-cases/refresh-token.use-case';
import { LogoutUseCase } from '@/modules/iam/auth/use-cases/logout.use-case';
import { JwtAuthGuard } from '@/modules/iam/auth/guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Sesión iniciada correctamente.')
  @ApiOperation({ summary: 'Inicia sesión y devuelve access + refresh.' })
  @ApiOkResponse({ type: LoginResponseDto })
  login(
    @Body() dto: LoginDto,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<LoginResult> {
    return this.loginUseCase.execute({
      email: dto.email,
      password: dto.password,
      ip: client.ip,
      userAgent: client.userAgent,
    });
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Token renovado.')
  @ApiOperation({ summary: 'Renueva el access token con un refresh válido.' })
  @ApiOkResponse({ type: RefreshResponseDto })
  refresh(
    @Body() dto: RefreshTokenDto,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<RefreshResult> {
    return this.refreshUseCase.execute({
      refreshToken: dto.refreshToken,
      ip: client.ip,
      userAgent: client.userAgent,
    });
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Sesión cerrada.')
  @ApiOperation({ summary: 'Cierra sesión y revoca los tokens.' })
  async logout(
    @Body() dto: LogoutDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<void> {
    await this.logoutUseCase.execute({
      refreshToken: dto.refreshToken,
      accessJti: user.jti,
      actorUserId: user.userId,
      ip: client.ip,
      userAgent: client.userAgent,
    });
  }
}
