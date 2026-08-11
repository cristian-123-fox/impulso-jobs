import { Inject, Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { PlanFeatureValue } from '@/modules/billing/entities/plan-feature-value.entity';
import { Plan } from '@/modules/billing/entities/plan.entity';
import { PlanFeatureCode } from '@/modules/billing/enums/billing.enums';
import {
  type IPlanRepository,
  PLAN_REPOSITORY,
} from '@/modules/billing/repositories/plan.repository.interface';
import { TalentAccessGrant } from '@/modules/talent/entities/talent-access-grant.entity';
import {
  TalentGrantSource,
  UNLIMITED_VISITS,
} from '@/modules/talent/enums/talent-access.enum';
import {
  type ITalentAccessRepository,
  TALENT_ACCESS_REPOSITORY,
} from '@/modules/talent/repositories/talent-access.repository.interface';
import { Vacancy } from '@/modules/vacancies/entities/vacancy.entity';
import {
  type IVacancyRepository,
  VACANCY_REPOSITORY,
} from '@/modules/vacancies/repositories/vacancy.repository.interface';

/** Beneficios de un plan ya resueltos a valores utilizables. */
export interface PlanEntitlements {
  verifiedPublication: boolean;
  featuredRanking: boolean;
  urgentConfidentialBadge: boolean;
  socialMediaDistribution: boolean;
  screeningQuestions: boolean;
  autoRejectionMessage: boolean;
  applicantContactData: boolean;
  aiCandidateMatching: boolean;
  aiJobCreation: boolean;
  /** Nº de pausas permitidas. */
  pauseReactivate: number;
  editTitleOnReactivate: boolean;
  /** Visitas a la base de talento; `-1` = ilimitadas. */
  talentVisits: number;
  /** Días de publicación. Cae al `validity_days` del plan si no se define. */
  publicationDays: number | null;
}

/**
 * Traduce un plan comprado en efectos concretos: los distintivos de la vacante
 * (M10) y el cupo de visitas a la base de talento (M12).
 *
 * Es el puente que faltaba: M12 dejó el consumo del cupo listo y aquí es donde
 * se **otorga**.
 */
@Injectable()
export class EntitlementService {
  private readonly logger = new Logger(EntitlementService.name);

  constructor(
    @Inject(PLAN_REPOSITORY) private readonly plans: IPlanRepository,
    @Inject(VACANCY_REPOSITORY) private readonly vacancies: IVacancyRepository,
    @Inject(TALENT_ACCESS_REPOSITORY)
    private readonly talent: ITalentAccessRepository,
  ) {}

  /** Resuelve la matriz de beneficios de un plan a valores tipados. */
  async resolve(
    plan: Plan,
    manager?: EntityManager,
  ): Promise<PlanEntitlements> {
    const values = await this.plans.findValuesByPlanIds([plan.id], manager);
    const byCode = new Map(values.map((value) => [value.featureCode, value]));

    return {
      verifiedPublication: this.bool(
        byCode,
        PlanFeatureCode.VERIFIED_PUBLICATION,
      ),
      featuredRanking: this.bool(byCode, PlanFeatureCode.FEATURED_RANKING),
      urgentConfidentialBadge: this.bool(
        byCode,
        PlanFeatureCode.URGENT_CONFIDENTIAL_BADGE,
      ),
      socialMediaDistribution: this.bool(
        byCode,
        PlanFeatureCode.SOCIAL_MEDIA_DISTRIBUTION,
      ),
      screeningQuestions: this.bool(
        byCode,
        PlanFeatureCode.SCREENING_QUESTIONS,
      ),
      autoRejectionMessage: this.bool(
        byCode,
        PlanFeatureCode.AUTO_REJECTION_MESSAGE,
      ),
      applicantContactData: this.bool(
        byCode,
        PlanFeatureCode.APPLICANT_CONTACT_DATA,
      ),
      aiCandidateMatching: this.bool(
        byCode,
        PlanFeatureCode.AI_CANDIDATE_MATCHING,
      ),
      aiJobCreation: this.bool(byCode, PlanFeatureCode.AI_JOB_CREATION),
      pauseReactivate: this.number(byCode, PlanFeatureCode.PAUSE_REACTIVATE, 0),
      editTitleOnReactivate: this.bool(
        byCode,
        PlanFeatureCode.EDIT_TITLE_ON_REACTIVATE,
      ),
      talentVisits: this.number(byCode, PlanFeatureCode.TALENT_DB_ACCESS, 0),
      publicationDays: this.optionalNumber(
        byCode,
        PlanFeatureCode.PUBLICATION_DAYS,
      ),
    };
  }

  /**
   * Aplica los beneficios a la vacante promocionada y devuelve cuándo caduca
   * la promoción. Los distintivos que el plan no incluye **no** se apagan aquí:
   * de eso se encarga `revoke` al expirar, para no pisar un flag que un
   * administrador haya puesto a mano.
   */
  async applyToVacancy(
    vacancyId: string,
    plan: Plan,
    entitlements: PlanEntitlements,
    startsAt: Date,
    manager?: EntityManager,
  ): Promise<{ vacancy: Vacancy | null; endsAt: Date | null }> {
    const vacancy = await this.vacancies.findById(vacancyId, manager);
    if (!vacancy) {
      this.logger.warn(
        `No se aplicaron beneficios: la vacante ${vacancyId} no existe.`,
      );
      return { vacancy: null, endsAt: null };
    }

    if (entitlements.verifiedPublication) vacancy.isVerified = true;
    if (entitlements.featuredRanking) vacancy.isFeatured = true;
    vacancy.maxPauses = entitlements.pauseReactivate;
    vacancy.canEditTitleOnReactivate = entitlements.editTitleOnReactivate;
    // Promocionar re-sube la vacante en el portal.
    vacancy.refreshedAt = startsAt;

    const days = entitlements.publicationDays ?? plan.validityDays ?? null;
    const endsAt = days === null ? null : this.addDays(startsAt, days);

    await this.vacancies.save(vacancy, manager);
    return { vacancy, endsAt };
  }

  /** Revierte los distintivos al expirar o cancelarse la promoción. */
  async revokeFromVacancy(
    vacancyId: string,
    manager?: EntityManager,
  ): Promise<void> {
    const vacancy = await this.vacancies.findById(vacancyId, manager);
    if (!vacancy) return;

    vacancy.isFeatured = false;
    vacancy.isUrgent = false;
    vacancy.isVerified = false;
    // El tope de pausas vuelve al mínimo, pero nunca por debajo de las ya
    // consumidas: no tendría sentido dejar el contador en negativo.
    vacancy.maxPauses = Math.max(
      0,
      Math.min(vacancy.maxPauses, vacancy.pauseCount),
    );
    vacancy.canEditTitleOnReactivate = false;

    await this.vacancies.save(vacancy, manager);
  }

  /**
   * Otorga el cupo de visitas a la base de talento. Es lo que M12 esperaba
   * para dejar de responder 402.
   */
  async grantTalentVisits(
    companyId: string,
    entitlements: PlanEntitlements,
    source: TalentGrantSource,
    sourceId: string,
    expiresAt: Date | null,
    manager?: EntityManager,
  ): Promise<TalentAccessGrant | null> {
    const visits = entitlements.talentVisits;
    if (visits === 0) return null;

    const grant = new TalentAccessGrant();
    grant.companyId = companyId;
    grant.sourceType = source;
    grant.sourceId = sourceId;
    grant.totalVisits = visits < 0 ? UNLIMITED_VISITS : visits;
    grant.usedVisits = 0;
    grant.expiresAt = expiresAt;

    return this.talent.saveGrant(grant, manager);
  }

  private bool(
    values: Map<string, PlanFeatureValue>,
    code: PlanFeatureCode,
  ): boolean {
    return values.get(code)?.isIncluded ?? false;
  }

  private number(
    values: Map<string, PlanFeatureValue>,
    code: PlanFeatureCode,
    fallback: number,
  ): number {
    return this.optionalNumber(values, code) ?? fallback;
  }

  private optionalNumber(
    values: Map<string, PlanFeatureValue>,
    code: PlanFeatureCode,
  ): number | null {
    const row = values.get(code);
    if (!row || !row.isIncluded) return null;
    const parsed = Number(row.value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private addDays(from: Date, days: number): Date {
    const result = new Date(from);
    result.setDate(result.getDate() + days);
    return result;
  }
}
