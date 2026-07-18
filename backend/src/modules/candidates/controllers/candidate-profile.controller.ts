import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
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
import {
  CandidateEducationResponseDto,
  CandidateExperienceResponseDto,
  CandidateLanguageResponseDto,
  CandidateProfileResponseDto,
  CandidateSkillResponseDto,
  LanguageCatalogResponseDto,
  UpdateCandidatePhotoDto,
  UpdateCandidateProfileDto,
  UpsertCandidateEducationDto,
  UpsertCandidateExperienceDto,
  UpsertCandidateLanguageDto,
  UpsertCandidateSkillDto,
  toCandidateEducationResponse,
  toCandidateExperienceResponse,
  toCandidateLanguageResponse,
  toCandidateProfileResponse,
  toCandidateSkillResponse,
  toLanguageCatalogResponse,
} from '@/modules/candidates/dto/candidate-profile.dto';
import { CandidateEducationUseCase } from '@/modules/candidates/use-cases/candidate-education.use-case';
import { CandidateExperienceUseCase } from '@/modules/candidates/use-cases/candidate-experience.use-case';
import { CandidateLanguageUseCase } from '@/modules/candidates/use-cases/candidate-language.use-case';
import { CandidateProfileUseCase } from '@/modules/candidates/use-cases/candidate-profile.use-case';
import { CandidateSkillUseCase } from '@/modules/candidates/use-cases/candidate-skill.use-case';
import { JwtAuthGuard } from '@/modules/iam/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/modules/iam/permissions/guards/permissions.guard';

@ApiTags('candidate-profile')
@ApiBearerAuth()
@Controller('candidate/profile')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CandidateProfileController {
  constructor(
    private readonly profileUseCase: CandidateProfileUseCase,
    private readonly experienceUseCase: CandidateExperienceUseCase,
    private readonly educationUseCase: CandidateEducationUseCase,
    private readonly languageUseCase: CandidateLanguageUseCase,
    private readonly skillUseCase: CandidateSkillUseCase,
  ) {}

  @Get()
  @RequirePermissions('candidate_profile.read')
  @ResponseMessage('Perfil del candidato obtenido.')
  async getProfile(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CandidateProfileResponseDto> {
    const result = await this.profileUseCase.getProfile(user.userId, user.role);
    return toCandidateProfileResponse(
      result.profile,
      result.email,
      result.completion,
    );
  }

  @Put()
  @RequirePermissions('candidate_profile.update')
  @ResponseMessage('Perfil del candidato actualizado.')
  async updateProfile(
    @Body() dto: UpdateCandidateProfileDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<CandidateProfileResponseDto> {
    const result = await this.profileUseCase.updateProfile({
      ...dto,
      userId: user.userId,
      role: user.role,
      ip: client.ip,
      userAgent: client.userAgent,
    });
    return toCandidateProfileResponse(
      result.profile,
      result.email,
      result.completion,
    );
  }

  @Patch('photo')
  @RequirePermissions('candidate_profile.update')
  @ResponseMessage('Foto de perfil actualizada.')
  async updatePhoto(
    @Body() dto: UpdateCandidatePhotoDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<{ profilePhotoUrl: string | null }> {
    const profile = await this.profileUseCase.updatePhoto({
      profilePhotoUrl: dto.profilePhotoUrl,
      userId: user.userId,
      role: user.role,
      ip: client.ip,
      userAgent: client.userAgent,
    });
    return { profilePhotoUrl: profile.profilePhotoUrl ?? null };
  }

  @Get('catalogs/languages')
  @RequirePermissions('candidate_profile.read')
  @ResponseMessage('Catálogo de idiomas obtenido.')
  async listLanguageCatalog(): Promise<LanguageCatalogResponseDto[]> {
    const languages = await this.profileUseCase.listCatalogLanguages();
    return languages.map(toLanguageCatalogResponse);
  }

  @Get('experience')
  @RequirePermissions('experiences.manage')
  @ResponseMessage('Experiencia obtenida.')
  async listExperiences(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CandidateExperienceResponseDto[]> {
    const items = await this.experienceUseCase.list(user.userId, user.role);
    return items.map(toCandidateExperienceResponse);
  }

  @Post('experience')
  @RequirePermissions('experiences.manage')
  @ResponseMessage('Experiencia creada.')
  async createExperience(
    @Body() dto: UpsertCandidateExperienceDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<CandidateExperienceResponseDto> {
    const item = await this.experienceUseCase.save({
      ...dto,
      userId: user.userId,
      role: user.role,
      ip: client.ip,
      userAgent: client.userAgent,
    });
    return toCandidateExperienceResponse(item);
  }

  @Put('experience/:id')
  @RequirePermissions('experiences.manage')
  @ResponseMessage('Experiencia actualizada.')
  async updateExperience(
    @Param('id') id: string,
    @Body() dto: UpsertCandidateExperienceDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<CandidateExperienceResponseDto> {
    const item = await this.experienceUseCase.save({
      ...dto,
      id,
      userId: user.userId,
      role: user.role,
      ip: client.ip,
      userAgent: client.userAgent,
    });
    return toCandidateExperienceResponse(item);
  }

  @Delete('experience/:id')
  @RequirePermissions('experiences.manage')
  @ResponseMessage('Experiencia eliminada.')
  async removeExperience(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<void> {
    await this.experienceUseCase.remove(
      id,
      user.userId,
      user.role,
      client.ip,
      client.userAgent,
    );
  }

  @Get('education')
  @RequirePermissions('educations.manage')
  @ResponseMessage('Educación obtenida.')
  async listEducations(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CandidateEducationResponseDto[]> {
    const items = await this.educationUseCase.list(user.userId, user.role);
    return items.map(toCandidateEducationResponse);
  }

  @Post('education')
  @RequirePermissions('educations.manage')
  @ResponseMessage('Educación creada.')
  async createEducation(
    @Body() dto: UpsertCandidateEducationDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<CandidateEducationResponseDto> {
    const item = await this.educationUseCase.save({
      ...dto,
      userId: user.userId,
      role: user.role,
      ip: client.ip,
      userAgent: client.userAgent,
    });
    return toCandidateEducationResponse(item);
  }

  @Put('education/:id')
  @RequirePermissions('educations.manage')
  @ResponseMessage('Educación actualizada.')
  async updateEducation(
    @Param('id') id: string,
    @Body() dto: UpsertCandidateEducationDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<CandidateEducationResponseDto> {
    const item = await this.educationUseCase.save({
      ...dto,
      id,
      userId: user.userId,
      role: user.role,
      ip: client.ip,
      userAgent: client.userAgent,
    });
    return toCandidateEducationResponse(item);
  }

  @Delete('education/:id')
  @RequirePermissions('educations.manage')
  @ResponseMessage('Educación eliminada.')
  async removeEducation(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<void> {
    await this.educationUseCase.remove(
      id,
      user.userId,
      user.role,
      client.ip,
      client.userAgent,
    );
  }

  @Get('languages')
  @RequirePermissions('languages.manage')
  @ResponseMessage('Idiomas obtenidos.')
  async listLanguages(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CandidateLanguageResponseDto[]> {
    const items = await this.languageUseCase.list(user.userId, user.role);
    return items.map((item) =>
      toCandidateLanguageResponse(item.candidateLanguage, item.language),
    );
  }

  @Post('languages')
  @RequirePermissions('languages.manage')
  @ResponseMessage('Idioma creado.')
  async createLanguage(
    @Body() dto: UpsertCandidateLanguageDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<CandidateLanguageResponseDto> {
    const item = await this.languageUseCase.save({
      ...dto,
      userId: user.userId,
      role: user.role,
      ip: client.ip,
      userAgent: client.userAgent,
    });
    const catalog = await this.profileUseCase.listCatalogLanguages();
    const language = catalog.find((entry) => entry.code === item.languageCode)!;
    return toCandidateLanguageResponse(item, language);
  }

  @Put('languages/:id')
  @RequirePermissions('languages.manage')
  @ResponseMessage('Idioma actualizado.')
  async updateLanguage(
    @Param('id') id: string,
    @Body() dto: UpsertCandidateLanguageDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<CandidateLanguageResponseDto> {
    const item = await this.languageUseCase.save({
      ...dto,
      id,
      userId: user.userId,
      role: user.role,
      ip: client.ip,
      userAgent: client.userAgent,
    });
    const catalog = await this.profileUseCase.listCatalogLanguages();
    const language = catalog.find((entry) => entry.code === item.languageCode)!;
    return toCandidateLanguageResponse(item, language);
  }

  @Delete('languages/:id')
  @RequirePermissions('languages.manage')
  @ResponseMessage('Idioma eliminado.')
  async removeLanguage(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<void> {
    await this.languageUseCase.remove(
      id,
      user.userId,
      user.role,
      client.ip,
      client.userAgent,
    );
  }

  @Get('skills')
  @RequirePermissions('skills.manage')
  @ResponseMessage('Habilidades obtenidas.')
  async listSkills(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CandidateSkillResponseDto[]> {
    const items = await this.skillUseCase.list(user.userId, user.role);
    return items.map(toCandidateSkillResponse);
  }

  @Post('skills')
  @RequirePermissions('skills.manage')
  @ResponseMessage('Habilidad creada.')
  async createSkill(
    @Body() dto: UpsertCandidateSkillDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<CandidateSkillResponseDto> {
    const item = await this.skillUseCase.save({
      ...dto,
      userId: user.userId,
      role: user.role,
      ip: client.ip,
      userAgent: client.userAgent,
    });
    return toCandidateSkillResponse(item);
  }

  @Put('skills/:id')
  @RequirePermissions('skills.manage')
  @ResponseMessage('Habilidad actualizada.')
  async updateSkill(
    @Param('id') id: string,
    @Body() dto: UpsertCandidateSkillDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<CandidateSkillResponseDto> {
    const item = await this.skillUseCase.save({
      ...dto,
      id,
      userId: user.userId,
      role: user.role,
      ip: client.ip,
      userAgent: client.userAgent,
    });
    return toCandidateSkillResponse(item);
  }

  @Delete('skills/:id')
  @RequirePermissions('skills.manage')
  @ResponseMessage('Habilidad eliminada.')
  async removeSkill(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<void> {
    await this.skillUseCase.remove(
      id,
      user.userId,
      user.role,
      client.ip,
      client.userAgent,
    );
  }
}
