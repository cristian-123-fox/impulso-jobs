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
  AddCompanyMemberDto,
  CompanyMemberResponseDto,
  UpdateCompanyMemberRoleDto,
} from '@/modules/companies/dto/company-member.dto';
import { CompanyMembersUseCase } from '@/modules/companies/use-cases/company-members.use-case';
import { JwtAuthGuard } from '@/modules/iam/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/modules/iam/permissions/guards/permissions.guard';
import { RolesGuard } from '@/modules/iam/permissions/guards/roles.guard';

/**
 * Equipo de **la propia** empresa. Es el gemelo autoservicio de
 * `/admin/companies/:id/members`: misma lógica, pero la empresa nunca viaja en
 * la URL — se resuelve de la sesión, así que nadie puede tocar el equipo de un
 * tercero cambiando un id.
 *
 * Consultar el equipo lo puede cualquier miembro; darlo de alta, cambiar el rol
 * interno o retirarlo, sólo el propietario o un administrador de la empresa.
 */
@ApiTags('company-team')
@ApiBearerAuth()
@Controller('company/members')
@RequireRoles(Role.EMPLOYER)
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class CompanyTeamController {
  constructor(private readonly members: CompanyMembersUseCase) {}

  @Get()
  @RequirePermissions('company_users.manage')
  @ResponseMessage('Equipo de la empresa obtenido.')
  async list(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CompanyMemberResponseDto[]> {
    const companyId = await this.members.resolveOwnCompanyId(user.userId);
    return this.members.list(companyId);
  }

  @Post()
  @RequirePermissions('company_users.manage')
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Miembro agregado al equipo.')
  async add(
    @Body() dto: AddCompanyMemberDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<CompanyMemberResponseDto> {
    const companyId = await this.members.resolveOwnCompanyId(user.userId, {
      manage: true,
    });
    return this.members.add({
      companyId,
      ...dto,
      actorUserId: user.userId,
      ip: client.ip,
      userAgent: client.userAgent,
    });
  }

  @Patch(':userId')
  @RequirePermissions('company_users.manage')
  @ResponseMessage('Rol interno actualizado.')
  async updateRole(
    @Param('userId') userId: string,
    @Body() dto: UpdateCompanyMemberRoleDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<CompanyMemberResponseDto> {
    const companyId = await this.members.resolveOwnCompanyId(user.userId, {
      manage: true,
    });
    return this.members.updateRole({
      companyId,
      userId,
      role: dto.role,
      actorUserId: user.userId,
      ip: client.ip,
      userAgent: client.userAgent,
    });
  }

  @Delete(':userId')
  @RequirePermissions('company_users.manage')
  @ResponseMessage('Miembro retirado del equipo.')
  async remove(
    @Param('userId') userId: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<void> {
    const companyId = await this.members.resolveOwnCompanyId(user.userId, {
      manage: true,
    });
    await this.members.remove({
      companyId,
      userId,
      actorUserId: user.userId,
      ip: client.ip,
      userAgent: client.userAgent,
    });
  }
}
