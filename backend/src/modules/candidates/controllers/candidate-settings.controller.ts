import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
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
  CandidateSettingsResponseDto,
  UpdateCandidateSettingsDto,
  toCandidateSettingsResponse,
} from '@/modules/candidates/dto/candidate-settings.dto';
import { CandidateSettingsUseCase } from '@/modules/candidates/use-cases/candidate-settings.use-case';
import { JwtAuthGuard } from '@/modules/iam/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/modules/iam/permissions/guards/permissions.guard';

@ApiTags('candidate-settings')
@ApiBearerAuth()
@Controller('candidate/profile-settings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CandidateSettingsController {
  constructor(private readonly settingsUseCase: CandidateSettingsUseCase) {}

  @Get()
  @RequirePermissions('settings.read')
  @ResponseMessage('Configuración del candidato obtenida.')
  async getSettings(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CandidateSettingsResponseDto> {
    const settings = await this.settingsUseCase.getSettings(
      user.userId,
      user.role,
    );
    return toCandidateSettingsResponse(settings);
  }

  @Put()
  @RequirePermissions('settings.update')
  @ResponseMessage('Configuración del candidato actualizada.')
  async updateSettings(
    @Body() dto: UpdateCandidateSettingsDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<CandidateSettingsResponseDto> {
    const settings = await this.settingsUseCase.updateSettings({
      ...dto,
      userId: user.userId,
      role: user.role,
      ip: client.ip,
      userAgent: client.userAgent,
    });
    return toCandidateSettingsResponse(settings);
  }
}
