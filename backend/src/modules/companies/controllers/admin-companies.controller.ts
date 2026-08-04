import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
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
import type { PaginatedResponse } from '@/common/dto/paginated-response.dto';
import type { AuthenticatedUser } from '@/common/types/authenticated-user';
import {
  AdminCompanyResponseDto,
  CreateCompanyDto,
  ListCompaniesQueryDto,
} from '@/modules/companies/dto/admin-company.dto';
import {
  AdminCompaniesUseCase,
  CreateCompanyResult,
} from '@/modules/companies/use-cases/admin-companies.use-case';
import { JwtAuthGuard } from '@/modules/iam/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/modules/iam/permissions/guards/permissions.guard';

@ApiTags('admin-companies')
@ApiBearerAuth()
@Controller('admin/companies')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminCompaniesController {
  constructor(private readonly useCase: AdminCompaniesUseCase) {}

  @Get()
  @RequirePermissions('companies.read')
  @ResponseMessage('Empresas obtenidas.')
  list(
    @Query() query: ListCompaniesQueryDto,
  ): Promise<PaginatedResponse<AdminCompanyResponseDto>> {
    return this.useCase.list({
      search: query.search,
      state: query.state,
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
}
