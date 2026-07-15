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
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import type { AuthenticatedUser } from '@/common/types/authenticated-user';
import { JwtAuthGuard } from '@/modules/iam/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/modules/iam/permissions/guards/permissions.guard';
import { PermissionResponseDto } from '@/modules/iam/permissions/dto/permission-response.dto';
import { toPermissionResponse } from '@/modules/iam/permissions/dto/permission.mapper';
import { CreateRoleDto } from '@/modules/iam/roles/dto/create-role.dto';
import { UpdateRoleDto } from '@/modules/iam/roles/dto/update-role.dto';
import { AssignPermissionDto } from '@/modules/iam/roles/dto/assign-permission.dto';
import {
  RoleResponseDto,
  toRoleResponse,
} from '@/modules/iam/roles/dto/role-response.dto';
import { ListRolesUseCase } from '@/modules/iam/roles/use-cases/list-roles.use-case';
import { GetRoleUseCase } from '@/modules/iam/roles/use-cases/get-role.use-case';
import { CreateRoleUseCase } from '@/modules/iam/roles/use-cases/create-role.use-case';
import { UpdateRoleUseCase } from '@/modules/iam/roles/use-cases/update-role.use-case';
import { ListRolePermissionsUseCase } from '@/modules/iam/roles/use-cases/list-role-permissions.use-case';
import { AssignRolePermissionUseCase } from '@/modules/iam/roles/use-cases/assign-role-permission.use-case';
import { RemoveRolePermissionUseCase } from '@/modules/iam/roles/use-cases/remove-role-permission.use-case';

@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(
    private readonly listRoles: ListRolesUseCase,
    private readonly getRole: GetRoleUseCase,
    private readonly createRole: CreateRoleUseCase,
    private readonly updateRole: UpdateRoleUseCase,
    private readonly listRolePermissions: ListRolePermissionsUseCase,
    private readonly assignRolePermission: AssignRolePermissionUseCase,
    private readonly removeRolePermission: RemoveRolePermissionUseCase,
  ) {}

  @Get()
  @RequirePermissions('roles.read')
  @ResponseMessage('Roles obtenidos.')
  async list(): Promise<RoleResponseDto[]> {
    const roles = await this.listRoles.execute();
    return roles.map((role) => toRoleResponse(role));
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
    const { role, permissionIds } = await this.getRole.execute(id);
    return toRoleResponse(role, permissionIds);
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

  @Get(':id/permissions')
  @RequirePermissions('roles.read')
  @ResponseMessage('Permisos del rol obtenidos.')
  async permissions(@Param('id') id: string): Promise<PermissionResponseDto[]> {
    const permissions = await this.listRolePermissions.execute(id);
    return permissions.map(toPermissionResponse);
  }

  @Post(':id/permissions')
  @RequirePermissions('permissions.assign')
  @ResponseMessage('Permiso asignado al rol.')
  async assignPermission(
    @Param('id') id: string,
    @Body() dto: AssignPermissionDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<void> {
    await this.assignRolePermission.execute({
      roleId: id,
      permissionId: dto.permissionId,
      actorUserId: user.userId,
      ip: client.ip,
      userAgent: client.userAgent,
    });
  }

  @Delete(':id/permissions/:permissionId')
  @RequirePermissions('permissions.assign')
  @ResponseMessage('Permiso removido del rol.')
  async removePermission(
    @Param('id') id: string,
    @Param('permissionId') permissionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<void> {
    await this.removeRolePermission.execute({
      roleId: id,
      permissionId,
      actorUserId: user.userId,
      ip: client.ip,
      userAgent: client.userAgent,
    });
  }
}
