import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ClientInfo,
  type ClientInfoPayload,
} from '@/common/decorators/client-info.decorator';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { LoginResponseDto } from '@/modules/iam/auth/dto/auth-response.dto';
import { SessionResult } from '@/modules/iam/auth/services/session.service';
import { GoogleLoginDto } from '@/modules/iam/social-login/dto/google-login.dto';
import { GoogleLoginUseCase } from '@/modules/iam/social-login/use-cases/google-login.use-case';

@ApiTags('auth')
@Controller('auth')
export class GoogleLoginController {
  constructor(private readonly googleLogin: GoogleLoginUseCase) {}

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Sesión iniciada correctamente.')
  @ApiOperation({
    summary:
      'Inicia sesión con el credential de Google (crea la cuenta de candidato si no existe).',
  })
  @ApiOkResponse({ type: LoginResponseDto })
  login(
    @Body() dto: GoogleLoginDto,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<SessionResult> {
    return this.googleLogin.execute({
      credential: dto.credential,
      ip: client.ip,
      userAgent: client.userAgent,
    });
  }
}
