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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  IMAGE_MULTER_LIMIT_BYTES,
  type UploadedImageFile,
} from '@/common/storage/image-upload';
import {
  ClientInfo,
  type ClientInfoPayload,
} from '@/common/decorators/client-info.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RequirePermissions } from '@/common/decorators/require-permissions.decorator';
import { RequireRoles } from '@/common/decorators/require-roles.decorator';
import { Role } from '@/common/types/role.enum';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import type { PaginatedResponse } from '@/common/dto/paginated-response.dto';
import type { AuthenticatedUser } from '@/common/types/authenticated-user';
import {
  AdminCompanyResponseDto,
  CreateCompanyDto,
  ListCompaniesQueryDto,
  UpdateCompanyDto,
} from '@/modules/companies/dto/admin-company.dto';
import {
  AddCompanyMemberDto,
  CompanyMemberResponseDto,
  UpdateCompanyMemberRoleDto,
} from '@/modules/companies/dto/company-member.dto';
import {
  AdminCompaniesUseCase,
  CreateCompanyResult,
} from '@/modules/companies/use-cases/admin-companies.use-case';
import { CompanyMembersUseCase } from '@/modules/companies/use-cases/company-members.use-case';
import { JwtAuthGuard } from '@/modules/iam/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/modules/iam/permissions/guards/permissions.guard';
import { RolesGuard } from '@/modules/iam/permissions/guards/roles.guard';

@ApiTags('admin-companies')
@ApiBearerAuth()
@Controller('admin/companies')
@RequireRoles(Role.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class AdminCompaniesController {
  constructor(
    private readonly useCase: AdminCompaniesUseCase,
    private readonly membersUseCase: CompanyMembersUseCase,
  ) {}

  @Get()
  @RequirePermissions('companies.read')
  @ResponseMessage('Empresas obtenidas.')
  list(
    @Query() query: ListCompaniesQueryDto,
  ): Promise<PaginatedResponse<AdminCompanyResponseDto>> {
    return this.useCase.list({
      search: query.search,
      state: query.state,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
    });
  }

  @Post()
  @RequirePermissions('companies.create')
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Empresa creada.')
  create(
    @Body() dto: CreateCompanyDto,
    @CurrentUser() actor: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<CreateCompanyResult> {
    return this.useCase.create({
      ...dto,
      actorUserId: actor.userId,
      ip: client.ip,
      userAgent: client.userAgent,
    });
  }

  @Get(':id')
  @RequirePermissions('companies.read')
  @ResponseMessage('Empresa obtenida.')
  get(@Param('id') id: string): Promise<AdminCompanyResponseDto> {
    return this.useCase.get(id);
  }

  /** El RFC no se edita: identifica fiscalmente a la empresa. */
  @Put(':id')
  @RequirePermissions('companies.update')
  @ResponseMessage('Empresa actualizada.')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCompanyDto,
    @CurrentUser() actor: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<AdminCompanyResponseDto> {
    return this.useCase.update({
      ...dto,
      id,
      actorUserId: actor.userId,
      ip: client.ip,
      userAgent: client.userAgent,
    });
  }

  // ---------------------------------------------------------------- equipo
  @Get(':id/members')
  @RequirePermissions('company_users.manage')
  @ResponseMessage('Equipo de la empresa obtenido.')
  listMembers(@Param('id') id: string): Promise<CompanyMemberResponseDto[]> {
    return this.membersUseCase.list(id);
  }

  @Post(':id/members')
  @RequirePermissions('company_users.manage')
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Miembro agregado al equipo.')
  addMember(
    @Param('id') id: string,
    @Body() dto: AddCompanyMemberDto,
    @CurrentUser() actor: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<CompanyMemberResponseDto> {
    return this.membersUseCase.add({
      companyId: id,
      ...dto,
      actorUserId: actor.userId,
      ip: client.ip,
      userAgent: client.userAgent,
    });
  }

  @Patch(':id/members/:userId')
  @RequirePermissions('company_users.manage')
  @ResponseMessage('Rol interno actualizado.')
  updateMemberRole(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateCompanyMemberRoleDto,
    @CurrentUser() actor: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<CompanyMemberResponseDto> {
    return this.membersUseCase.updateRole({
      companyId: id,
      userId,
      role: dto.role,
      actorUserId: actor.userId,
      ip: client.ip,
      userAgent: client.userAgent,
    });
  }

  @Delete(':id/members/:userId')
  @RequirePermissions('company_users.manage')
  @ResponseMessage('Miembro retirado del equipo.')
  removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<void> {
    return this.membersUseCase.remove({
      companyId: id,
      userId,
      actorUserId: actor.userId,
      ip: client.ip,
      userAgent: client.userAgent,
    });
  }

  // ----------------------------------------------------------------- logo
  @Post(':id/logo')
  @RequirePermissions('companies.update')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: IMAGE_MULTER_LIMIT_BYTES } }),
  )
  @ResponseMessage('Logo de la empresa actualizado.')
  async uploadLogo(
    @Param('id') id: string,
    @UploadedFile() file: UploadedImageFile | undefined,
    @CurrentUser() actor: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<{ logoUrl: string | null }> {
    const company = await this.useCase.uploadLogo({
      companyId: id,
      file,
      actorUserId: actor.userId,
      ip: client.ip,
      userAgent: client.userAgent,
    });
    return { logoUrl: company.logoUrl ?? null };
  }
}
