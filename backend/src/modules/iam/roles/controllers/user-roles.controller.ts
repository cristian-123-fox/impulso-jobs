import {
  Body,
  Controller,
  Delete,
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
import { JwtAuthGuard } from '@/modules/iam/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/modules/iam/permissions/guards/permissions.guard';
import { AssignUserRoleDto } from '@/modules/iam/roles/dto/assign-user-role.dto';
import { AssignUserRoleUseCase } from '@/modules/iam/roles/use-cases/assign-user-role.use-case';
import { RemoveUserRoleUseCase } from '@/modules/iam/roles/use-cases/remove-user-role.use-case';

/** Asignación de roles a usuarios (`/users/{id}/roles`). */
@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UserRolesController {
  constructor(
    private readonly assignUserRole: AssignUserRoleUseCase,
    private readonly removeUserRole: RemoveUserRoleUseCase,
  ) {}

  @Post(':id/roles')
  @RequirePermissions('roles.assign')
  @ResponseMessage('Rol asignado al usuario.')
  async assign(
    @Param('id') id: string,
    @Body() dto: AssignUserRoleDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<void> {
    await this.assignUserRole.execute({
      userId: id,
      roleId: dto.roleId,
      actorUserId: user.userId,
      ip: client.ip,
      userAgent: client.userAgent,
    });
  }

  @Delete(':id/roles/:roleId')
  @RequirePermissions('roles.assign')
  @ResponseMessage('Rol removido del usuario.')
  async remove(
    @Param('id') id: string,
    @Param('roleId') roleId: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<void> {
    await this.removeUserRole.execute({
      userId: id,
      roleId,
      actorUserId: user.userId,
      ip: client.ip,
      userAgent: client.userAgent,
    });
  }
}
