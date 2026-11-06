import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@/common/decorators/require-permissions.decorator';
import { RequireRoles } from '@/common/decorators/require-roles.decorator';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { Role } from '@/common/types/role.enum';
import { JwtAuthGuard } from '@/modules/iam/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/modules/iam/permissions/guards/permissions.guard';
import { RolesGuard } from '@/modules/iam/permissions/guards/roles.guard';
import {
  PERMISSION_REPOSITORY,
  type IPermissionRepository,
} from '@/modules/iam/permissions/repositories/permission.repository.interface';
import { PermissionsService } from '@/modules/iam/permissions/services/permissions.service';
import { PermissionCatalogResponseDto } from '@/modules/iam/permissions/dto/permission-response.dto';
import { toPermissionCatalogResponse } from '@/modules/iam/permissions/dto/permission.mapper';

@ApiTags('permissions')
@ApiBearerAuth()
@Controller('permissions')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@RequireRoles(Role.ADMIN)
export class PermissionsController {
  constructor(
    @Inject(PERMISSION_REPOSITORY)
    private readonly permissions: IPermissionRepository,
    private readonly permissionsService: PermissionsService,
  ) {}

  /**
   * Catálogo completo para el árbol de `/admin/roles/:id`: permisos con su
   * etiqueta y grupo, los grupos y lo que concede cada ámbito por sí solo.
   */
  @Get()
  @RequirePermissions('roles.read')
  @ResponseMessage('Permisos obtenidos.')
  @ApiOkResponse({ type: PermissionCatalogResponseDto })
  async list(): Promise<PermissionCatalogResponseDto> {
    const permissions = await this.permissions.findAll();
    return toPermissionCatalogResponse(permissions);
  }

  /**
   * Recarga el mapa `rol → permisos` en memoria.
   *
   * El `PermissionsGuard` cachea ese mapa por proceso. Tras un `pnpm seed`, un
   * cambio por SQL o una migración de permisos, el proceso en marcha sigue
   * respondiendo con el mapa viejo (403 incluidos) hasta reiniciarse. Este
   * endpoint evita el reinicio manual.
   *
   * En cPanel con varios workers, cada proceso tiene su propia caché: hay que
   * llamar al endpoint contra cada uno o seguir reiniciando la app completa.
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('permissions.assign')
  @ResponseMessage('Caché de permisos recargada.')
  @ApiOkResponse({
    schema: { example: { refreshed: true } },
  })
  async refresh(): Promise<{ refreshed: true }> {
    this.permissionsService.invalidate();
    return { refreshed: true };
  }
}
