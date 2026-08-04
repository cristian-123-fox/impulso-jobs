import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
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
import { CreateUserDto } from '@/modules/iam/users/dto/create-user.dto';
import { ListUsersQueryDto } from '@/modules/iam/users/dto/list-users-query.dto';
import {
  SetUserRolesDto,
  UpdateUserDto,
  UpdateUserStatusDto,
} from '@/modules/iam/users/dto/update-user.dto';
import { UserResponseDto } from '@/modules/iam/users/dto/user-response.dto';
import { CreateUserUseCase } from '@/modules/iam/users/use-cases/create-user.use-case';
import { DeleteUserUseCase } from '@/modules/iam/users/use-cases/delete-user.use-case';
import { GetUserUseCase } from '@/modules/iam/users/use-cases/get-user.use-case';
import {
  ListUsersResult,
  ListUsersUseCase,
} from '@/modules/iam/users/use-cases/list-users.use-case';
import { SetUserRolesUseCase } from '@/modules/iam/users/use-cases/set-user-roles.use-case';
import { UpdateUserUseCase } from '@/modules/iam/users/use-cases/update-user.use-case';

@ApiTags('admin-users')
@ApiBearerAuth()
@Controller('admin/users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminUsersController {
  constructor(
    private readonly listUsers: ListUsersUseCase,
    private readonly getUser: GetUserUseCase,
    private readonly createUser: CreateUserUseCase,
    private readonly updateUser: UpdateUserUseCase,
    private readonly setUserRoles: SetUserRolesUseCase,
    private readonly deleteUser: DeleteUserUseCase,
  ) {}

  @Get()
  @RequirePermissions('users.read')
  @ResponseMessage('Usuarios obtenidos.')
  list(@Query() query: ListUsersQueryDto): Promise<ListUsersResult> {
    return this.listUsers.execute({
      search: query.search,
      role: query.role,
      status: query.status,
      emailVerified: query.emailVerified,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
    });
  }

  @Post()
  @RequirePermissions('users.create')
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Usuario creado.')
  create(
    @Body() dto: CreateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<UserResponseDto> {
    return this.createUser.execute({
      ...dto,
      actorUserId: actor.userId,
      ip: client.ip,
      userAgent: client.userAgent,
    });
  }

  @Get(':id')
  @RequirePermissions('users.read')
  @ResponseMessage('Usuario obtenido.')
  get(@Param('id') id: string): Promise<UserResponseDto> {
    return this.getUser.execute(id);
  }

  @Put(':id')
  @RequirePermissions('users.update')
  @ResponseMessage('Usuario actualizado.')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<UserResponseDto> {
    return this.updateUser.execute({
      id,
      ...dto,
      actorUserId: actor.userId,
      ip: client.ip,
      userAgent: client.userAgent,
    });
  }

  @Put(':id/roles')
  @RequirePermissions('roles.assign')
  @ResponseMessage('Roles del usuario actualizados.')
  updateRoles(
    @Param('id') id: string,
    @Body() dto: SetUserRolesDto,
    @CurrentUser() actor: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<UserResponseDto> {
    return this.setUserRoles.execute({
      userId: id,
      roleIds: dto.roleIds,
      actorUserId: actor.userId,
      ip: client.ip,
      userAgent: client.userAgent,
    });
  }

  @Patch(':id/status')
  @RequirePermissions('users.block')
  @ResponseMessage('Estado del usuario actualizado.')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<UserResponseDto> {
    return this.updateUser.execute({
      id,
      status: dto.status,
      actorUserId: actor.userId,
      ip: client.ip,
      userAgent: client.userAgent,
    });
  }

  @Delete(':id')
  @RequirePermissions('users.delete')
  @ResponseMessage('Usuario eliminado.')
  remove(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<void> {
    return this.deleteUser.execute({
      id,
      actorUserId: actor.userId,
      ip: client.ip,
      userAgent: client.userAgent,
    });
  }
}
