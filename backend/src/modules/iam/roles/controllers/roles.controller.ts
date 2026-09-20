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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  ClientInfo,
  type ClientInfoPayload,
} from '@/common/decorators/client-info.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RequirePermissions } from '@/common/decorators/require-permissions.decorator';
import { RequireRoles } from '@/common/decorators/require-roles.decorator';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import type { AuthenticatedUser } from '@/common/types/authenticated-user';
import { Role } from '@/common/types/role.enum';
import { JwtAuthGuard } from '@/modules/iam/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/modules/iam/permissions/guards/permissions.guard';
import { RolesGuard } from '@/modules/iam/permissions/guards/roles.guard';
import { PermissionResponseDto } from '@/modules/iam/permissions/dto/permission-response.dto';
import { toPermissionResponse } from '@/modules/iam/permissions/dto/permission.mapper';
import { CreateRoleDto } from '@/modules/iam/roles/dto/create-role.dto';
import { UpdateRoleDto } from '@/modules/iam/roles/dto/update-role.dto';
import { ReplaceRolePermissionsDto } from '@/modules/iam/roles/dto/replace-role-permissions.dto';
import {
  RoleResponseDto,
  toRoleResponse,
} from '@/modules/iam/roles/dto/role-response.dto';
import { ListRolesUseCase } from '@/modules/iam/roles/use-cases/list-roles.use-case';
import { GetRoleUseCase } from '@/modules/iam/roles/use-cases/get-role.use-case';
import { CreateRoleUseCase } from '@/modules/iam/roles/use-cases/create-role.use-case';
import { UpdateRoleUseCase } from '@/modules/iam/roles/use-cases/update-role.use-case';
import { DeleteRoleUseCase } from '@/modules/iam/roles/use-cases/delete-role.use-case';
import { ListRolePermissionsUseCase } from '@/modules/iam/roles/use-cases/list-role-permissions.use-case';
import { ReplaceRolePermissionsUseCase } from '@/modules/iam/roles/use-cases/replace-role-permissions.use-case';

/**
 * Administración de roles. Rol **y** permiso: `roles.*` lo tiene hoy sólo el
 * administrador, pero el permiso por sí solo no separa el back-office del
 * autoservicio — la misma regla que rige `/admin/**`.
 */
@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@RequireRoles(Role.ADMIN)
export class RolesController {
  constructor(
    private readonly listRoles: ListRolesUseCase,
    private readonly getRole: GetRoleUseCase,
    private readonly createRole: CreateRoleUseCase,
    private readonly updateRole: UpdateRoleUseCase,
    private readonly deleteRole: DeleteRoleUseCase,
    private readonly listRolePermissions: ListRolePermissionsUseCase,
    private readonly replaceRolePermissions: ReplaceRolePermissionsUseCase,
  ) {}

  @Get()
  @RequirePermissions('roles.read')
  @ResponseMessage('Roles obtenidos.')
  async list(): Promise<RoleResponseDto[]> {
    const roles = await this.listRoles.execute();
    return roles.map(({ role, permissionCount }) =>
      toRoleResponse(role, { permissionCount }),
    );
  }

  @Post()
  @RequirePermissions('roles.create')
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Rol creado.')
  async create(
    @Body() dto: CreateRoleDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<RoleResponseDto> {
    const role = await this.createRole.execute({
      code: dto.code,
      name: dto.name,
      scope: dto.scope,
      description: dto.description,
      actorUserId: user.userId,
      ip: client.ip,
      userAgent: client.userAgent,
    });
    return toRoleResponse(role);
  }

  @Get(':id')
  @RequirePermissions('roles.read')
  @ResponseMessage('Rol obtenido.')
  async get(@Param('id') id: string): Promise<RoleResponseDto> {
    const { role, permissionIds, lockedPermissionIds } =
      await this.getRole.execute(id);
    return toRoleResponse(role, { permissionIds, lockedPermissionIds });
  }

  @Put(':id')
  @RequirePermissions('roles.update')
  @ResponseMessage('Rol actualizado.')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<RoleResponseDto> {
    const role = await this.updateRole.execute({
      id,
      name: dto.name,
      description: dto.description,
      actorUserId: user.userId,
      ip: client.ip,
      userAgent: client.userAgent,
    });
    return toRoleResponse(role);
  }

  /** Sólo roles personalizados y sin usuarios asignados (ver el caso de uso). */
  @Delete(':id')
  @RequirePermissions('roles.delete')
  @ResponseMessage('Rol eliminado.')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<void> {
    await this.deleteRole.execute({
      id,
      actorUserId: user.userId,
      ip: client.ip,
      userAgent: client.userAgent,
    });
  }

  @Get(':id/permissions')
  @RequirePermissions('roles.read')
  @ResponseMessage('Permisos del rol obtenidos.')
  async permissions(@Param('id') id: string): Promise<PermissionResponseDto[]> {
    const permissions = await this.listRolePermissions.execute(id);
    return permissions.map(toPermissionResponse);
  }

  /**
   * Guardado en lote del árbol de permisos: recibe el conjunto completo que
   * queda marcado y devuelve el resultado real para que la UI se resincronice.
   */
  @Put(':id/permissions')
  @RequirePermissions('permissions.assign')
  @ResponseMessage('Permisos del rol actualizados.')
  async replacePermissions(
    @Param('id') id: string,
    @Body() dto: ReplaceRolePermissionsDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<string[]> {
    return this.replaceRolePermissions.execute({
      roleId: id,
      permissionIds: dto.permissionIds,
      actorUserId: user.userId,
      ip: client.ip,
      userAgent: client.userAgent,
    });
  }
}
