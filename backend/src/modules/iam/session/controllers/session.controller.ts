import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import type { AuthenticatedUser } from '@/common/types/authenticated-user';
import { JwtAuthGuard } from '@/modules/iam/auth/guards/jwt-auth.guard';
import { CurrentUserDto } from '@/modules/iam/session/dto/current-user.dto';
import { GetCurrentUserUseCase } from '@/modules/iam/session/use-cases/get-current-user.use-case';

/**
 * `GET /auth/me` (T27). Comparte prefijo con `AuthController` pero vive en su
 * propio módulo: resolver el nombre y la foto obliga a leer de `candidates` y
 * `companies`, y ambos módulos importan `AuthModule` — meterlo allí cerraría
 * el ciclo (mismo motivo por el que existe `AdminUsersModule`).
 *
 * No lleva `@RequirePermissions`: leer la propia identidad es universal a los
 * tres roles, como `POST /auth/logout`.
 */
@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth')
@UseGuards(JwtAuthGuard)
export class SessionController {
  constructor(private readonly getCurrentUser: GetCurrentUserUseCase) {}

  @Get('me')
  @ResponseMessage('Sesión vigente.')
  @ApiOperation({
    summary: 'Identidad de la sesión activa (nombre e imagen según el rol).',
  })
  @ApiOkResponse({ type: CurrentUserDto })
  me(@CurrentUser() user: AuthenticatedUser): Promise<CurrentUserDto> {
    return this.getCurrentUser.execute(user.userId);
  }
}
