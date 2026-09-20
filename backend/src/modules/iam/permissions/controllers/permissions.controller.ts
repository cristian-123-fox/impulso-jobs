import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
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
}
