import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import {
  ClientInfo,
  type ClientInfoPayload,
} from '@/common/decorators/client-info.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RequirePermissions } from '@/common/decorators/require-permissions.decorator';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import {
  IMAGE_MULTER_LIMIT_BYTES,
  type UploadedImageFile,
} from '@/common/storage/image-upload';
import type { AuthenticatedUser } from '@/common/types/authenticated-user';
import { AccountExportDto } from '@/modules/iam/account/dto/account-export.dto';
import {
  AccountProfileDto,
  ChangePasswordDto,
  UpdateAccountProfileDto,
} from '@/modules/iam/account/dto/account-profile.dto';
import { DeleteAccountDto } from '@/modules/iam/account/dto/account.dto';
import { ChangePasswordUseCase } from '@/modules/iam/account/use-cases/change-password.use-case';
import { DeleteAccountUseCase } from '@/modules/iam/account/use-cases/delete-account.use-case';
import { ExportAccountDataUseCase } from '@/modules/iam/account/use-cases/export-account-data.use-case';
import { GetAccountProfileUseCase } from '@/modules/iam/account/use-cases/get-account-profile.use-case';
import { RestoreAccountUseCase } from '@/modules/iam/account/use-cases/restore-account.use-case';
import { UpdateAccountProfileUseCase } from '@/modules/iam/account/use-cases/update-account-profile.use-case';
import { JwtAuthGuard } from '@/modules/iam/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/modules/iam/permissions/guards/permissions.guard';
import { UpdateUserPhotoUseCase } from '@/modules/iam/users/use-cases/update-user-photo.use-case';

/**
 * La propia cuenta: identidad, credenciales y derechos ARCO (M13, LFPDPPP).
 * Acceso → `GET /account/data-export` · Cancelación → `DELETE /account`.
 * Rectificación → `PUT /account/profile` para la identidad de `users`, y los
 * endpoints de perfil de dominio (M6/M9) para los datos de candidato y
 * empresa. Oposición, en la configuración de visibilidad (M8).
 *
 * **Todo lo de aquí actúa sobre `@CurrentUser()`, nunca sobre un id de la
 * ruta** (la excepción es `:id/restore`, que es administrativa). Aun así se
 * exige permiso, como el resto del controlador, para que el negocio pueda
 * retirárselo a un rol desde `/admin/roles`.
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
    private readonly getProfile: GetAccountProfileUseCase,
    private readonly updateProfile: UpdateAccountProfileUseCase,
    private readonly changePassword: ChangePasswordUseCase,
    private readonly photo: UpdateUserPhotoUseCase,
  ) {}

  /** Identidad de la propia cuenta, tal y como está en `users`. */
  @Get('profile')
  @RequirePermissions('account.profile_manage')
  @ResponseMessage('Perfil obtenido.')
  profile(@CurrentUser() user: AuthenticatedUser): Promise<AccountProfileDto> {
    return this.getProfile.execute(user.userId);
  }

  /** Rectificación de la identidad. El correo no se toca aquí (ver el DTO). */
  @Put('profile')
  @RequirePermissions('account.profile_manage')
  @ResponseMessage('Perfil actualizado.')
  update(
    @Body() dto: UpdateAccountProfileDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<AccountProfileDto> {
    return this.updateProfile.execute({
      userId: user.userId,
      ...dto,
      ip: client.ip,
      userAgent: client.userAgent,
    });
  }

  /**
   * Cambio de contraseña con re-autenticación.
   *
   * ⚠️ Cierra **todas** las sesiones, incluida la que llama: responde 204 y el
   * siguiente request con el token viejo dará 401. El cliente debe avisar
   * antes y mandar al login después.
   */
  @Post('password')
  @RequirePermissions('account.profile_manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  async password(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<void> {
    await this.changePassword.execute({
      userId: user.userId,
      currentPassword: dto.currentPassword,
      newPassword: dto.newPassword,
      ip: client.ip,
      userAgent: client.userAgent,
    });
  }

  /** Foto de la cuenta. Mismo caso de uso que el back-office, sobre uno mismo. */
  @Post('photo')
  @RequirePermissions('account.profile_manage')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: IMAGE_MULTER_LIMIT_BYTES } }),
  )
  @ResponseMessage('Foto actualizada.')
  async uploadPhoto(
    @UploadedFile() file: UploadedImageFile | undefined,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<{ photoUrl: string | null }> {
    const photoUrl = await this.photo.upload(user.userId, file, {
      actorUserId: user.userId,
      ip: client.ip,
      userAgent: client.userAgent,
    });
    return { photoUrl };
  }

  @Delete('photo')
  @RequirePermissions('account.profile_manage')
  @ResponseMessage('Foto eliminada.')
  removePhoto(
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<void> {
    return this.photo.remove(user.userId, {
      actorUserId: user.userId,
      ip: client.ip,
      userAgent: client.userAgent,
    });
  }

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
