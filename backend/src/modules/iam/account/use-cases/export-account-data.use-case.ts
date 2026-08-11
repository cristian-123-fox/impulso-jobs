import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { AuditService } from '@/modules/audit/audit.service';
import {
  type ICandidateApplicationRepository,
  CANDIDATE_APPLICATION_REPOSITORY,
} from '@/modules/applications/repositories/candidate-application.repository.interface';
import {
  type IApplicationStatusHistoryRepository,
  APPLICATION_STATUS_HISTORY_REPOSITORY,
} from '@/modules/applications/repositories/application-status-history.repository.interface';
import {
  type ICandidateEducationRepository,
  CANDIDATE_EDUCATION_REPOSITORY,
} from '@/modules/candidates/repositories/candidate-education.repository.interface';
import {
  type ICandidateExperienceRepository,
  CANDIDATE_EXPERIENCE_REPOSITORY,
} from '@/modules/candidates/repositories/candidate-experience.repository.interface';
import {
  type ICandidateLanguageRepository,
  CANDIDATE_LANGUAGE_REPOSITORY,
} from '@/modules/candidates/repositories/candidate-language.repository.interface';
import {
  type ICandidateProfileSettingsRepository,
  CANDIDATE_PROFILE_SETTINGS_REPOSITORY,
} from '@/modules/candidates/repositories/candidate-profile-settings.repository.interface';
import {
  type ICandidateProfileRepository,
  CANDIDATE_PROFILE_REPOSITORY,
} from '@/modules/candidates/repositories/candidate-profile.repository.interface';
import {
  type ICandidateResumeRepository,
  CANDIDATE_RESUME_REPOSITORY,
} from '@/modules/candidates/repositories/candidate-resume.repository.interface';
import {
  type ICandidateSkillRepository,
  CANDIDATE_SKILL_REPOSITORY,
} from '@/modules/candidates/repositories/candidate-skill.repository.interface';
import {
  type ICompanyRepository,
  COMPANY_REPOSITORY,
} from '@/modules/companies/repositories/company.repository.interface';
import {
  type ICompanyUserRepository,
  COMPANY_USER_REPOSITORY,
} from '@/modules/companies/repositories/company-user.repository.interface';
import {
  AccountExportApplicationDto,
  AccountExportCandidateDto,
  AccountExportCompanyDto,
  AccountExportDto,
} from '@/modules/iam/account/dto/account-export.dto';
import {
  type IRoleRepository,
  ROLE_REPOSITORY,
} from '@/modules/iam/roles/repositories/role.repository.interface';
import {
  type IUserRoleRepository,
  USER_ROLE_REPOSITORY,
} from '@/modules/iam/users/repositories/user-role.repository.interface';
import {
  type IUserRepository,
  USER_REPOSITORY,
} from '@/modules/iam/users/repositories/user.repository.interface';
import {
  type IVacancyRepository,
  VACANCY_REPOSITORY,
} from '@/modules/vacancies/repositories/vacancy.repository.interface';

export interface ExportAccountDataCommand {
  userId: string;
  ip: string;
  userAgent: string;
}

function iso(value?: Date | string | null): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
}

/** Copia plana de una entidad, sin los campos de control de TypeORM. */
function plain(entity: object): Record<string, unknown> {
  const { deletedAt, ...rest } = entity as Record<string, unknown> & {
    deletedAt?: unknown;
  };
  void deletedAt;
  return rest;
}

/**
 * Derecho de **Acceso** (ARCO): devuelve en JSON todo lo que la plataforma
 * guarda sobre el titular. Es sólo lectura y queda auditado — saber quién pidió
 * un export es en sí mismo un dato relevante.
 */
@Injectable()
export class ExportAccountDataUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(USER_ROLE_REPOSITORY)
    private readonly userRoles: IUserRoleRepository,
    @Inject(ROLE_REPOSITORY) private readonly roles: IRoleRepository,
    @Inject(CANDIDATE_PROFILE_REPOSITORY)
    private readonly profiles: ICandidateProfileRepository,
    @Inject(CANDIDATE_PROFILE_SETTINGS_REPOSITORY)
    private readonly settings: ICandidateProfileSettingsRepository,
    @Inject(CANDIDATE_EXPERIENCE_REPOSITORY)
    private readonly experiences: ICandidateExperienceRepository,
    @Inject(CANDIDATE_EDUCATION_REPOSITORY)
    private readonly educations: ICandidateEducationRepository,
    @Inject(CANDIDATE_LANGUAGE_REPOSITORY)
    private readonly languages: ICandidateLanguageRepository,
    @Inject(CANDIDATE_SKILL_REPOSITORY)
    private readonly skills: ICandidateSkillRepository,
    @Inject(CANDIDATE_RESUME_REPOSITORY)
    private readonly resumes: ICandidateResumeRepository,
    @Inject(COMPANY_USER_REPOSITORY)
    private readonly members: ICompanyUserRepository,
    @Inject(COMPANY_REPOSITORY) private readonly companies: ICompanyRepository,
    @Inject(CANDIDATE_APPLICATION_REPOSITORY)
    private readonly applications: ICandidateApplicationRepository,
    @Inject(APPLICATION_STATUS_HISTORY_REPOSITORY)
    private readonly history: IApplicationStatusHistoryRepository,
    @Inject(VACANCY_REPOSITORY) private readonly vacancies: IVacancyRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(command: ExportAccountDataCommand): Promise<AccountExportDto> {
    const user = await this.users.findById(command.userId);
    if (!user) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.USER_NOT_FOUND,
        'El usuario no existe.',
      );
    }

    const roleIds = await this.userRoles.findRoleIdsByUserId(user.id);
    const roleCodes = (await this.roles.findByIds(roleIds)).map(
      (role) => role.code,
    );

    const profile = await this.profiles.findByUserId(user.id);
    const [candidate, company, applications] = await Promise.all([
      profile
        ? this.buildCandidate(profile.id, profile)
        : Promise.resolve(null),
      this.buildCompany(user.id),
      profile ? this.buildApplications(profile.id) : Promise.resolve([]),
    ]);

    await this.audit.record({
      action: 'account.data_export',
      actorUserId: user.id,
      entity: 'user',
      entityId: user.id,
      ip: command.ip,
      userAgent: command.userAgent,
      metadata: {
        hasCandidateProfile: Boolean(profile),
        applicationCount: applications.length,
      },
    });

    return {
      generatedAt: new Date().toISOString(),
      account: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        emailVerifiedAt: iso(user.emailVerifiedAt),
        lastLogin: iso(user.lastLogin),
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        roles: roleCodes,
      },
      candidate,
      company,
      applications,
    };
  }

  private async buildCandidate(
    profileId: string,
    profile: {
      id: string;
      firstName: string;
      lastName: string;
      documentType: string;
      documentNumber: string;
      curp?: string | null;
      birthDate: string;
      professionalTitle?: string | null;
      summary?: string | null;
      country: string;
      state: string;
      municipality: string;
      address?: string | null;
      profilePhotoUrl?: string | null;
    },
  ): Promise<AccountExportCandidateDto> {
    const [settings, experiences, educations, languages, skills, resumes] =
      await Promise.all([
        this.settings.findByProfileId(profileId),
        this.experiences.findByProfileId(profileId),
        this.educations.findByProfileId(profileId),
        this.languages.findByProfileId(profileId),
        this.skills.findByProfileId(profileId),
        this.resumes.findByProfileId(profileId),
      ]);

    return {
      id: profile.id,
      firstName: profile.firstName,
      lastName: profile.lastName,
      documentType: profile.documentType,
      documentNumber: profile.documentNumber,
      curp: profile.curp ?? null,
      birthDate: profile.birthDate,
      professionalTitle: profile.professionalTitle ?? null,
      summary: profile.summary ?? null,
      country: profile.country,
      state: profile.state,
      municipality: profile.municipality,
      address: profile.address ?? null,
      profilePhotoUrl: profile.profilePhotoUrl ?? null,
      settings: settings
        ? {
            profileVisibility: settings.profileVisibility,
            informationVisibility: settings.informationVisibility,
            isImmediatelyAvailable: settings.isImmediatelyAvailable,
          }
        : null,
      experiences: experiences.map(plain),
      educations: educations.map(plain),
      languages: languages.map(plain),
      skills: skills.map(plain),
      // Sólo metadatos: el PDF se descarga por `GET /candidate/resumes/:id/download`.
      resumes: resumes.map((resume) => ({
        id: resume.id,
        fileName: resume.fileName,
        fileSize: resume.fileSize,
        mimeType: resume.mimeType,
        isDefault: resume.isDefault,
        createdAt: resume.createdAt,
      })),
    };
  }

  private async buildCompany(
    userId: string,
  ): Promise<AccountExportCompanyDto | null> {
    const membership = await this.members.findByUserId(userId);
    if (!membership) return null;

    const company = await this.companies.findById(membership.companyId);
    if (!company) return null;

    return {
      companyId: company.id,
      businessName: company.businessName,
      rfc: company.rfc,
      memberRole: membership.role,
      memberSince: membership.createdAt.toISOString(),
    };
  }

  private async buildApplications(
    profileId: string,
  ): Promise<AccountExportApplicationDto[]> {
    const [rows] = await this.applications.findAndCountByProfile({
      candidateProfileId: profileId,
      page: 1,
      // El export no pagina: es un volcado completo por definición.
      limit: 1000,
    });
    if (rows.length === 0) return [];

    const vacancies = await this.vacancies.findByIds(
      rows.map((row) => row.vacancyId),
    );
    const companies = await this.companies.findByIds(
      rows.map((row) => row.companyId),
    );
    const vacancyById = new Map(vacancies.map((item) => [item.id, item]));
    const companyById = new Map(companies.map((item) => [item.id, item]));

    return Promise.all(
      rows.map(async (row) => {
        const entries = await this.history.findByApplicationId(row.id);
        const vacancy = vacancyById.get(row.vacancyId);
        const company = companyById.get(row.companyId);
        return {
          id: row.id,
          vacancyId: row.vacancyId,
          vacancyTitle: vacancy?.title ?? null,
          // Se identifica a la empresa aunque la vacante sea confidencial: es
          // información del propio proceso del titular.
          companyName: company?.businessName ?? null,
          statusCode: row.statusCode,
          appliedAt: row.appliedAt.toISOString(),
          history: entries.map((entry) => ({
            previousStatusCode: entry.previousStatusCode ?? null,
            currentStatusCode: entry.currentStatusCode,
            changedAt: entry.changedAt.toISOString(),
          })),
        };
      }),
    );
  }
}
