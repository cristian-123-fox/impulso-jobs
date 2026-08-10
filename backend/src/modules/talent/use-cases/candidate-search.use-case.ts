import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  PaginatedResponse,
  toPaginated,
} from '@/common/dto/paginated-response.dto';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { CandidateProfileSettings } from '@/modules/candidates/entities/candidate-profile-settings.entity';
import { InformationVisibility } from '@/modules/candidates/enums/candidate-settings.enum';
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
  type ICandidateResumeRepository,
  CANDIDATE_RESUME_REPOSITORY,
} from '@/modules/candidates/repositories/candidate-resume.repository.interface';
import {
  type ICandidateSkillRepository,
  CANDIDATE_SKILL_REPOSITORY,
} from '@/modules/candidates/repositories/candidate-skill.repository.interface';
import {
  type IUserRepository,
  USER_REPOSITORY,
} from '@/modules/iam/users/repositories/user.repository.interface';
import {
  CandidateDetailDto,
  CandidateSearchItemDto,
  toCandidateDetail,
  toCandidateSearchItem,
} from '@/modules/talent/dto/candidate-search-response.dto';
import { CandidateAccessSource } from '@/modules/talent/enums/talent-access.enum';
import {
  type ICandidateSearchRepository,
  CANDIDATE_SEARCH_REPOSITORY,
} from '@/modules/talent/repositories/candidate-search.repository.interface';
import {
  type ITalentAccessRepository,
  TALENT_ACCESS_REPOSITORY,
} from '@/modules/talent/repositories/talent-access.repository.interface';
import {
  TalentQuotaService,
  TalentQuotaSummary,
} from '@/modules/talent/services/talent-quota.service';
import { VacancyOwnershipService } from '@/modules/vacancies/services/vacancy-ownership.service';

export interface TalentActor {
  userId: string;
  ip: string;
  userAgent: string;
}

export interface SearchCandidatesCommand extends TalentActor {
  search?: string;
  state?: string;
  municipality?: string;
  educationLevel?: string;
  languageCode?: string;
  skill?: string;
  minExperienceYears?: number;
  immediatelyAvailable?: boolean;
  page: number;
  limit: number;
}

export interface SearchCandidatesResult extends PaginatedResponse<CandidateSearchItemDto> {
  quota: TalentQuotaSummary;
}

/**
 * HU-016: banco de talento.
 *
 * Visibilidad: la empresa ve los perfiles **públicos** y, además, a cualquiera
 * que haya postulado a una de sus vacantes aunque sea privado. Un perfil
 * privado que no ha postulado no aparece en el listado y responde 404 en el
 * detalle — no se distingue de uno inexistente.
 *
 * Cupo: el listado es gratuito; abrir el detalle de alguien de la base de
 * talento descuenta una visita (ver `TalentQuotaService`). Los postulados son
 * siempre gratuitos: la empresa ya los tiene en su proceso.
 */
@Injectable()
export class CandidateSearchUseCase {
  constructor(
    @Inject(CANDIDATE_SEARCH_REPOSITORY)
    private readonly candidates: ICandidateSearchRepository,
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
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(TALENT_ACCESS_REPOSITORY)
    private readonly access: ITalentAccessRepository,
    private readonly companyOwnership: VacancyOwnershipService,
    private readonly quota: TalentQuotaService,
    private readonly audit: AuditService,
  ) {}

  async search(
    command: SearchCandidatesCommand,
  ): Promise<SearchCandidatesResult> {
    const company = await this.companyOwnership.requireCompany(command.userId);

    const [rows, total] = await this.candidates.search({
      companyId: company.id,
      search: command.search,
      state: command.state,
      municipality: command.municipality,
      educationLevel: command.educationLevel,
      languageCode: command.languageCode,
      skill: command.skill,
      experienceSince: this.experienceThreshold(command.minExperienceYears),
      immediatelyAvailable: command.immediatelyAvailable,
      page: command.page,
      limit: command.limit,
    });

    // Tres consultas por lote en vez de tres por fila: quién postuló, a quién
    // ya se desbloqueó y la configuración de cada uno. Así la UI puede avisar
    // antes de gastar una visita.
    const profileIds = rows.map((profile) => profile.id);
    const [appliedIds, viewedIds, settingsRows, quota] = await Promise.all([
      this.candidates.filterAppliedToCompany(profileIds, company.id),
      this.access.findViewedCandidateIds(company.id, profileIds),
      this.settings.findByProfileIds(profileIds),
      this.quota.summary(company.id),
    ]);

    const applied = new Set(appliedIds);
    const viewed = new Set(viewedIds);
    const settingsById = new Map(
      settingsRows.map((row) => [row.candidateProfileId, row]),
    );

    const items = rows.map((profile) => {
      const source = applied.has(profile.id)
        ? CandidateAccessSource.APPLICANT
        : CandidateAccessSource.TALENT_POOL;
      return toCandidateSearchItem(
        profile,
        source,
        settingsById.get(profile.id)?.isImmediatelyAvailable ?? false,
        source === CandidateAccessSource.APPLICANT || viewed.has(profile.id),
      );
    });

    return {
      ...toPaginated(items, total, command.page, command.limit),
      quota,
    };
  }

  /**
   * Detalle del candidato. Consume una visita si viene de la base de talento y
   * es la primera vez que esta empresa lo abre.
   */
  async get(
    candidateProfileId: string,
    actor: TalentActor,
  ): Promise<CandidateDetailDto> {
    const company = await this.companyOwnership.requireCompany(actor.userId);

    const profile = await this.candidates.findVisibleById(
      candidateProfileId,
      company.id,
    );
    if (!profile) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.TALENT_CANDIDATE_NOT_FOUND,
        'El candidato no existe o su perfil no es visible para tu empresa.',
      );
    }

    const applied = await this.candidates.hasAppliedToCompany(
      profile.id,
      company.id,
    );
    const accessSource = applied
      ? CandidateAccessSource.APPLICANT
      : CandidateAccessSource.TALENT_POOL;

    // Sólo la base de talento consume cupo. Si está agotado, esto lanza 402
    // antes de leer nada más del candidato.
    const consumption = applied
      ? { charged: false, quota: await this.quota.summary(company.id) }
      : await this.quota.consume(company.id, profile.id);

    const settings = await this.settings.findByProfileId(profile.id);
    const [user, experiences, educations, languages, skills, resumes] =
      await Promise.all([
        this.users.findById(profile.userId),
        this.experiences.findByProfileId(profile.id),
        this.educations.findByProfileId(profile.id),
        this.languages.findByProfileId(profile.id),
        this.skills.findByProfileId(profile.id),
        this.resumes.findByProfileId(profile.id),
      ]);

    await this.audit.record({
      action: 'candidates.cv.read',
      actorUserId: actor.userId,
      entity: 'candidate_profile',
      entityId: profile.id,
      ip: actor.ip,
      userAgent: actor.userAgent,
      metadata: {
        companyId: company.id,
        accessSource,
        chargedVisit: consumption.charged,
        remainingVisits: consumption.quota.remainingVisits,
      },
    });

    return toCandidateDetail({
      profile,
      user,
      experiences,
      educations,
      languages,
      skills,
      resumes,
      isImmediatelyAvailable: settings?.isImmediatelyAvailable ?? false,
      showContact: this.showsContact(settings),
      accessSource,
      quota: consumption.quota,
    });
  }

  /** Estado del cupo, para el contador de la UI. */
  async quotaSummary(actor: TalentActor): Promise<TalentQuotaSummary> {
    const company = await this.companyOwnership.requireCompany(actor.userId);
    return this.quota.summary(company.id);
  }

  /**
   * `PARTIAL` oculta el contacto. Sin fila de configuración se aplica el
   * defecto de M8: información completa.
   */
  private showsContact(settings: CandidateProfileSettings | null): boolean {
    if (!settings) return true;
    return settings.informationVisibility === InformationVisibility.FULL;
  }

  /**
   * Traduce "N años de experiencia" a la fecha límite de inicio del primer
   * empleo. Se calcula aquí y no en SQL para no depender de las funciones de
   * fecha de cada motor.
   */
  private experienceThreshold(years?: number): Date | undefined {
    if (years === undefined || years <= 0) return undefined;
    const threshold = new Date();
    threshold.setFullYear(threshold.getFullYear() - years);
    return threshold;
  }
}
