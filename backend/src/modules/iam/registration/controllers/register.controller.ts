import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ClientInfo,
  type ClientInfoPayload,
} from '@/common/decorators/client-info.decorator';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { RegisterDto } from '@/modules/iam/registration/dto/register.dto';
import {
  RegisterResult,
  RegisterUseCase,
} from '@/modules/iam/registration/use-cases/register.use-case';

@ApiTags('auth')
@Controller('auth')
export class RegisterController {
  constructor(private readonly registerUseCase: RegisterUseCase) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Cuenta creada. Revisa tu correo para verificarla.')
  @ApiOperation({
    summary: 'Registra una empresa o un candidato según accountType.',
  })
  register(
    @Body() dto: RegisterDto,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<RegisterResult> {
    return this.registerUseCase.execute({
      accountType: dto.accountType,
      email: dto.email,
      password: dto.password,
      company: dto.company,
      candidate: dto.candidate,
      ip: client.ip,
      userAgent: client.userAgent,
    });
  }
}
