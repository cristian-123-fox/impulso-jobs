import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ClientInfo,
  type ClientInfoPayload,
} from '@/common/decorators/client-info.decorator';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { RequestPasswordResetDto } from '@/modules/iam/auth/dto/request-password-reset.dto';
import { ValidatePasswordResetDto } from '@/modules/iam/auth/dto/validate-password-reset.dto';
import { ConfirmPasswordResetDto } from '@/modules/iam/auth/dto/confirm-password-reset.dto';
import { RequestPasswordResetUseCase } from '@/modules/iam/auth/use-cases/request-password-reset.use-case';
import { ValidatePasswordResetUseCase } from '@/modules/iam/auth/use-cases/validate-password-reset.use-case';
import { ConfirmPasswordResetUseCase } from '@/modules/iam/auth/use-cases/confirm-password-reset.use-case';

@ApiTags('auth')
@Controller('auth/password-reset')
export class PasswordResetController {
  constructor(
    private readonly requestReset: RequestPasswordResetUseCase,
    private readonly validateReset: ValidatePasswordResetUseCase,
    private readonly confirmReset: ConfirmPasswordResetUseCase,
  ) {}

  @Post('request')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage(
    'Si el correo está registrado, te enviamos un enlace de recuperación.',
  )
  @ApiOperation({
    summary: 'Solicita un enlace de recuperación (respuesta genérica).',
  })
  async request(
    @Body() dto: RequestPasswordResetDto,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<void> {
    await this.requestReset.execute({
      email: dto.email,
      ip: client.ip,
      userAgent: client.userAgent,
    });
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Enlace válido.')
  @ApiOperation({ summary: 'Valida un token de recuperación.' })
  validate(@Body() dto: ValidatePasswordResetDto): Promise<{ valid: true }> {
    return this.validateReset.execute(dto.token);
  }

  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage(
    'Contraseña actualizada. Inicia sesión con tu nueva contraseña.',
  )
  @ApiOperation({
    summary: 'Confirma el cambio de contraseña (token de un solo uso).',
  })
  async confirm(
    @Body() dto: ConfirmPasswordResetDto,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<void> {
    await this.confirmReset.execute({
      token: dto.token,
      newPassword: dto.newPassword,
      confirmPassword: dto.confirmPassword,
      ip: client.ip,
      userAgent: client.userAgent,
    });
  }
}
