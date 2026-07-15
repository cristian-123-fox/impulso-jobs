import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ClientInfo,
  type ClientInfoPayload,
} from '@/common/decorators/client-info.decorator';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { ConfirmEmailVerificationDto } from '@/modules/iam/auth/dto/confirm-email-verification.dto';
import { ResendEmailVerificationDto } from '@/modules/iam/auth/dto/resend-email-verification.dto';
import {
  ConfirmEmailVerificationResult,
  ConfirmEmailVerificationUseCase,
} from '@/modules/iam/auth/use-cases/confirm-email-verification.use-case';
import { RequestEmailVerificationUseCase } from '@/modules/iam/auth/use-cases/request-email-verification.use-case';

@ApiTags('auth')
@Controller('auth/email-verification')
export class EmailVerificationController {
  constructor(
    private readonly confirmVerification: ConfirmEmailVerificationUseCase,
    private readonly requestVerification: RequestEmailVerificationUseCase,
  ) {}

  @Get('confirm')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Correo verificado. Ya puedes iniciar sesión.')
  @ApiOperation({
    summary: 'Confirma la verificación de correo (token de un solo uso).',
  })
  confirm(
    @Query() query: ConfirmEmailVerificationDto,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<ConfirmEmailVerificationResult> {
    return this.confirmVerification.execute({
      token: query.token,
      ip: client.ip,
      userAgent: client.userAgent,
    });
  }

  @Post('resend')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage(
    'Si el correo requiere verificación, te enviamos un nuevo enlace.',
  )
  @ApiOperation({
    summary: 'Reenvía el enlace de verificación (respuesta genérica).',
  })
  async resend(
    @Body() dto: ResendEmailVerificationDto,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<void> {
    await this.requestVerification.execute({
      email: dto.email,
      ip: client.ip,
      userAgent: client.userAgent,
    });
  }
}
