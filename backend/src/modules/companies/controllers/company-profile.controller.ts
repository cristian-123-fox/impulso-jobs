import { Body, Controller, Get, Patch, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  ClientInfo,
  type ClientInfoPayload,
} from '@/common/decorators/client-info.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RequirePermissions } from '@/common/decorators/require-permissions.decorator';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import type { AuthenticatedUser } from '@/common/types/authenticated-user';
import {
  CompanyProfileResponseDto,
  UpdateCompanyLogoDto,
  UpdateCompanyProfileDto,
  toCompanyProfileResponse,
} from '@/modules/companies/dto/company-profile.dto';
import { CompanyProfileUseCase } from '@/modules/companies/use-cases/company-profile.use-case';
import { JwtAuthGuard } from '@/modules/iam/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/modules/iam/permissions/guards/permissions.guard';

@ApiTags('company-profile')
@ApiBearerAuth()
@Controller('company/profile')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CompanyProfileController {
  constructor(private readonly profileUseCase: CompanyProfileUseCase) {}

  @Get()
  @RequirePermissions('companies.read')
  @ResponseMessage('Perfil de empresa obtenido.')
  async getProfile(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CompanyProfileResponseDto> {
    const result = await this.profileUseCase.getProfile(user.userId, user.role);
    return toCompanyProfileResponse(result.company, result.companyRole);
  }

  @Put()
  @RequirePermissions('companies.update')
  @ResponseMessage('Perfil de empresa actualizado.')
  async updateProfile(
    @Body() dto: UpdateCompanyProfileDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<CompanyProfileResponseDto> {
    const result = await this.profileUseCase.updateProfile({
      ...dto,
      userId: user.userId,
      role: user.role,
      ip: client.ip,
      userAgent: client.userAgent,
    });
    return toCompanyProfileResponse(result.company, result.companyRole);
  }

  @Patch('logo')
  @RequirePermissions('companies.update')
  @ResponseMessage('Logo de la empresa actualizado.')
  async updateLogo(
    @Body() dto: UpdateCompanyLogoDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<{ logoUrl: string | null }> {
    const company = await this.profileUseCase.updateLogo({
      logoUrl: dto.logoUrl,
      userId: user.userId,
      role: user.role,
      ip: client.ip,
      userAgent: client.userAgent,
    });
    return { logoUrl: company.logoUrl ?? null };
  }
}
