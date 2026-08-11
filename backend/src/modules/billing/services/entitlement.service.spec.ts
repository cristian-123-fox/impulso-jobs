import { PlanFeatureValue } from '@/modules/billing/entities/plan-feature-value.entity';
import { Plan } from '@/modules/billing/entities/plan.entity';
import {
  BillingPeriod,
  PlanFeatureCode,
  PlanType,
} from '@/modules/billing/enums/billing.enums';
import { IPlanRepository } from '@/modules/billing/repositories/plan.repository.interface';
import { EntitlementService } from '@/modules/billing/services/entitlement.service';
import {
  TalentGrantSource,
  UNLIMITED_VISITS,
} from '@/modules/talent/enums/talent-access.enum';
import { ITalentAccessRepository } from '@/modules/talent/repositories/talent-access.repository.interface';
import { Vacancy } from '@/modules/vacancies/entities/vacancy.entity';
import {
  EmploymentType,
  ExperienceLevel,
  VacancyStatus,
  WorkMode,
} from '@/modules/vacancies/enums/vacancy.enums';
import { IVacancyRepository } from '@/modules/vacancies/repositories/vacancy.repository.interface';

function value(
  code: string,
  isIncluded: boolean,
  raw?: string,
): PlanFeatureValue {
  return Object.assign(new PlanFeatureValue(), {
    planId: 'plan-1',
    featureCode: code,
    isIncluded,
    value: raw ?? null,
  });
}

function plan(): Plan {
  return Object.assign(new Plan(), {
    id: 'plan-1',
    code: 'ALTA',
    name: 'Alta',
    planType: PlanType.PER_PUBLICATION,
    basePrice: '1000.00',
    currency: 'MXN',
    taxRate: '0.1600',
    validityDays: 45,
    billingPeriod: BillingPeriod.ONE_TIME,
  });
}

function vacancy(): Vacancy {
  return Object.assign(new Vacancy(), {
    id: 'vac-1',
    companyId: 'company-1',
    title: 'Dev',
    description: 'x',
    employmentType: EmploymentType.FULL_TIME,
    workMode: WorkMode.HYBRID,
    state: 'JAL',
    municipality: 'Zapopan',
    experienceLevel: ExperienceLevel.MID,
    status: VacancyStatus.ACTIVE,
    salaryHidden: false,
    isVerified: false,
    isFeatured: false,
    isUrgent: false,
    isConfidential: false,
    pauseCount: 0,
    maxPauses: 0,
    canEditTitleOnReactivate: false,
  });
}

describe('EntitlementService', () => {
  let plans: jest.Mocked<IPlanRepository>;
  let vacancies: jest.Mocked<IVacancyRepository>;
  let talent: jest.Mocked<ITalentAccessRepository>;
  let service: EntitlementService;
  let current: Vacancy;

  beforeEach(() => {
    current = vacancy();

    plans = {
      findValuesByPlanIds: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<IPlanRepository>;

    vacancies = {
      findById: jest.fn(() => Promise.resolve(current)),
      save: jest.fn((v: Vacancy) => Promise.resolve(v)),
    } as unknown as jest.Mocked<IVacancyRepository>;

    talent = {
      saveGrant: jest.fn((g: unknown) => Promise.resolve(g)),
    } as unknown as jest.Mocked<ITalentAccessRepository>;

    service = new EntitlementService(plans, vacancies, talent);
  });

  describe('resolve', () => {
    it('traduce la matriz del plan a valores tipados', async () => {
      plans.findValuesByPlanIds.mockResolvedValue([
        value(PlanFeatureCode.FEATURED_RANKING, true),
        value(PlanFeatureCode.TALENT_DB_ACCESS, true, '20'),
        value(PlanFeatureCode.PAUSE_REACTIVATE, true, '2'),
        value(PlanFeatureCode.PUBLICATION_DAYS, true, '60'),
        value(PlanFeatureCode.AI_JOB_CREATION, false),
      ]);

      const result = await service.resolve(plan());

      expect(result.featuredRanking).toBe(true);
      expect(result.talentVisits).toBe(20);
      expect(result.pauseReactivate).toBe(2);
      expect(result.publicationDays).toBe(60);
      expect(result.aiJobCreation).toBe(false);
    });

    it('un beneficio ausente se interpreta como no incluido', async () => {
      const result = await service.resolve(plan());

      expect(result.featuredRanking).toBe(false);
      expect(result.talentVisits).toBe(0);
      expect(result.publicationDays).toBeNull();
    });

    it('un beneficio marcado como no incluido no aporta su valor', async () => {
      plans.findValuesByPlanIds.mockResolvedValue([
        value(PlanFeatureCode.TALENT_DB_ACCESS, false, '20'),
      ]);

      expect((await service.resolve(plan())).talentVisits).toBe(0);
    });
  });

  describe('applyToVacancy', () => {
    it('marca los distintivos y calcula el vencimiento', async () => {
      const startsAt = new Date('2026-08-11T00:00:00.000Z');
      const entitlements = await service.resolve(plan());

      const { endsAt } = await service.applyToVacancy(
        'vac-1',
        plan(),
        {
          ...entitlements,
          verifiedPublication: true,
          featuredRanking: true,
          pauseReactivate: 2,
          editTitleOnReactivate: true,
          publicationDays: 60,
        },
        startsAt,
      );

      expect(current.isVerified).toBe(true);
      expect(current.isFeatured).toBe(true);
      expect(current.maxPauses).toBe(2);
      expect(current.canEditTitleOnReactivate).toBe(true);
      expect(current.refreshedAt).toEqual(startsAt);
      // 60 días del beneficio, no los 45 del plan.
      expect(endsAt).toEqual(new Date('2026-10-10T00:00:00.000Z'));
    });

    it('sin días de beneficio cae al validity_days del plan', async () => {
      const startsAt = new Date('2026-08-11T00:00:00.000Z');
      const entitlements = await service.resolve(plan());

      const { endsAt } = await service.applyToVacancy(
        'vac-1',
        plan(),
        entitlements,
        startsAt,
      );

      expect(endsAt).toEqual(new Date('2026-09-25T00:00:00.000Z'));
    });

    it('no revienta si la vacante ya no existe', async () => {
      vacancies.findById.mockResolvedValue(null);
      const entitlements = await service.resolve(plan());

      const result = await service.applyToVacancy(
        'vac-x',
        plan(),
        entitlements,
        new Date(),
      );

      expect(result).toEqual({ vacancy: null, endsAt: null });
      expect(vacancies.save).not.toHaveBeenCalled();
    });
  });

  describe('revokeFromVacancy', () => {
    it('apaga los distintivos al expirar', async () => {
      current = Object.assign(vacancy(), {
        isVerified: true,
        isFeatured: true,
        isUrgent: true,
        maxPauses: 2,
        pauseCount: 1,
        canEditTitleOnReactivate: true,
      });

      await service.revokeFromVacancy('vac-1');

      expect(current.isFeatured).toBe(false);
      expect(current.isUrgent).toBe(false);
      expect(current.isVerified).toBe(false);
      expect(current.canEditTitleOnReactivate).toBe(false);
      // El tope no baja de lo ya consumido: nunca queda en negativo.
      expect(current.maxPauses).toBe(1);
    });
  });

  describe('grantTalentVisits', () => {
    it('otorga el cupo con la caducidad de la promoción', async () => {
      const entitlements = {
        ...(await service.resolve(plan())),
        talentVisits: 20,
      };
      const expiresAt = new Date('2026-10-10');

      await service.grantTalentVisits(
        'company-1',
        entitlements,
        TalentGrantSource.PROMOTION,
        'promo-1',
        expiresAt,
      );

      const grant = talent.saveGrant.mock.calls[0][0];
      expect(grant.companyId).toBe('company-1');
      expect(grant.totalVisits).toBe(20);
      expect(grant.usedVisits).toBe(0);
      expect(grant.sourceType).toBe(TalentGrantSource.PROMOTION);
      expect(grant.expiresAt).toEqual(expiresAt);
    });

    it('no crea cupo si el plan no incluye visitas', async () => {
      const entitlements = {
        ...(await service.resolve(plan())),
        talentVisits: 0,
      };

      const result = await service.grantTalentVisits(
        'company-1',
        entitlements,
        TalentGrantSource.PROMOTION,
        'promo-1',
        null,
      );

      expect(result).toBeNull();
      expect(talent.saveGrant).not.toHaveBeenCalled();
    });

    it('un valor negativo se guarda como ilimitado', async () => {
      const entitlements = {
        ...(await service.resolve(plan())),
        talentVisits: -1,
      };

      await service.grantTalentVisits(
        'company-1',
        entitlements,
        TalentGrantSource.SUBSCRIPTION,
        'sub-1',
        null,
      );

      expect(talent.saveGrant.mock.calls[0][0].totalVisits).toBe(
        UNLIMITED_VISITS,
      );
    });
  });
});
