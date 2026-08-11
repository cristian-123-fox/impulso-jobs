import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  ClientInfo,
  type ClientInfoPayload,
} from '@/common/decorators/client-info.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RequirePermissions } from '@/common/decorators/require-permissions.decorator';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import type { AuthenticatedUser } from '@/common/types/authenticated-user';
import { AccountExportDto } from '@/modules/iam/account/dto/account-export.dto';
import { DeleteAccountDto } from '@/modules/iam/account/dto/account.dto';
import { DeleteAccountUseCase } from '@/modules/iam/account/use-cases/delete-account.use-case';
import { ExportAccountDataUseCase } from '@/modules/iam/account/use-cases/export-account-data.use-case';
import { RestoreAccountUseCase } from '@/modules/iam/account/use-cases/restore-account.use-case';
import { JwtAuthGuard } from '@/modules/iam/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/modules/iam/permissions/guards/permissions.guard';

/**
 * Derechos ARCO sobre la propia cuenta (M13, LFPDPPP).
 * Acceso → `GET /account/data-export` · Cancelación → `DELETE /account`.
 * Rectificación se ejerce en los endpoints de perfil (M6/M9) y Oposición en la
 * configuración de visibilidad (M8).
 */
@ApiTags('account')
@ApiBearerAuth()
@Controller('account')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AccountController {
  constructor(
    private readonly deleteAccount: DeleteAccountUseCase,
    private readonly restoreAccount: RestoreAccountUseCase,
    private readonly exportData: ExportAccountDataUseCase,
  ) {}

  /** Derecho de Acceso: volcado en JSON de los datos del titular. */
  @Get('data-export')
  @RequirePermissions('account.data_export')
  @ResponseMessage('Export de datos generado.')
  export(
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<AccountExportDto> {
    return this.exportData.execute({
      userId: user.userId,
      ip: client.ip,
      userAgent: client.userAgent,
    });
  }

  /** Derecho de Cancelación: baja lógica e invalidación de las sesiones. */
  @Delete()
  @RequirePermissions('account.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Body() dto: DeleteAccountDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<void> {
    await this.deleteAccount.execute({
      userId: user.userId,
      password: dto.password,
      accessJti: user.jti,
      ip: client.ip,
      userAgent: client.userAgent,
    });
  }

  /** Reactivación por parte de un administrador. */
  @Post(':id/restore')
  @RequirePermissions('users.delete')
  @ResponseMessage('Cuenta restaurada.')
  @HttpCode(HttpStatus.OK)
  async restore(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<void> {
    await this.restoreAccount.execute({
      id,
      actorUserId: user.userId,
      ip: client.ip,
      userAgent: client.userAgent,
    });
  }
}
