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
import {
  CompanyPermissionCatalogDto,
  CompanyRoleResponseDto,
  SaveCompanyRoleDto,
} from '@/modules/companies/dto/company-role.dto';
import { CompanyMembersUseCase } from '@/modules/companies/use-cases/company-members.use-case';
import {
  CompanyRoleActor,
  CompanyRolesUseCase,
} from '@/modules/companies/use-cases/company-roles.use-case';
import { JwtAuthGuard } from '@/modules/iam/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/modules/iam/permissions/guards/permissions.guard';
import { RolesGuard } from '@/modules/iam/permissions/guards/roles.guard';

/**
 * Roles propios de la empresa (autoservicio). Como `company/members`, la
 * empresa **nunca viaja en la URL**: sale de la sesión. Y como gestionar el
 * equipo, exige además rol interno OWNER o ADMIN (`manage: true`) — también
 * para leer, porque la lista de roles sólo sirve a quien los asigna.
 */
@ApiTags('company-roles')
@ApiBearerAuth()
@Controller('company/roles')
@RequireRoles(Role.EMPLOYER)
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class CompanyRolesController {
  constructor(
    private readonly roles: CompanyRolesUseCase,
    private readonly members: CompanyMembersUseCase,
  ) {}

  @Get()
  @RequirePermissions('company_users.manage')
  @ResponseMessage('Roles de la empresa obtenidos.')
  async list(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CompanyRoleResponseDto[]> {
    return this.roles.list(await this.ownCompany(user));
  }

  /** Lo que se puede repartir entre los roles. Va antes de `:id`. */
  @Get('permissions')
  @RequirePermissions('company_users.manage')
  @ResponseMessage('Permisos disponibles obtenidos.')
  async permissions(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CompanyPermissionCatalogDto> {
    await this.ownCompany(user);
    return this.roles.catalog();
  }

  @Post()
  @RequirePermissions('company_users.manage')
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Rol creado.')
  async create(
    @Body() dto: SaveCompanyRoleDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<CompanyRoleResponseDto> {
    return this.roles.create(
      await this.ownCompany(user),
      dto,
      this.actor(user, client),
    );
  }

  @Put(':id')
  @RequirePermissions('company_users.manage')
  @ResponseMessage('Rol actualizado.')
  async update(
    @Param('id') id: string,
    @Body() dto: SaveCompanyRoleDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<CompanyRoleResponseDto> {
    return this.roles.update(
      await this.ownCompany(user),
      id,
      dto,
      this.actor(user, client),
    );
  }

  @Delete(':id')
  @RequirePermissions('company_users.manage')
  @ResponseMessage('Rol eliminado.')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<void> {
    await this.roles.remove(
      await this.ownCompany(user),
      id,
      this.actor(user, client),
    );
  }

  private ownCompany(user: AuthenticatedUser): Promise<string> {
    return this.members.resolveOwnCompanyId(user.userId, { manage: true });
  }

  private actor(
    user: AuthenticatedUser,
    client: ClientInfoPayload,
  ): CompanyRoleActor {
    return {
      actorUserId: user.userId,
      ip: client.ip,
      userAgent: client.userAgent,
    };
  }
}
