import { VacancyPromotionUseCase } from '@/modules/billing/use-cases/vacancy-promotion.use-case';
import { PromotionStatus } from '@/modules/billing/enums/billing.enums';
import { VacancyStatus } from '@/modules/vacancies/enums/vacancy.enums';
import type { CompanySubscription } from '@/modules/billing/entities/company-subscription.entity';
import type { Vacancy } from '@/modules/vacancies/entities/vacancy.entity';

/**
 * Lo que se protege aquí es el cupo de promoción:
 *
 * - El resumen lo calcula el plan (`promoted_vacancies`), no una caché vieja.
 * - La activación bloquea la suscripción y consume exactamente un cupo.
 * - La duración sale de `promotion_days` (7 días en Básico), no de
 *   `publication_days` (30 días de publicación).
 */
describe('VacancyPromotionUseCase', () => {
  const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const billing = {
    findLiveSubscriptionByCompany: jest.fn(),
    findLivePromotionByVacancy: jest.fn(),
    findAndCountPromotionsByCompany: jest.fn(),
    saveSubscription: jest.fn(),
    savePromotion: jest.fn(),
    findOrdersByPromotionId: jest.fn(),
  };
  const plans = { findById: jest.fn() };
  const ownership = {
    requireCompany: jest.fn(),
    requireOwnVacancy: jest.fn(),
  };
  const entitlements = {
    resolve: jest.fn(),
    applyToVacancy: jest.fn(),
  };
  const vacancies = { findById: jest.fn() };
  const audit = { record: jest.fn() };
  const dataSource = {
    transaction: jest.fn((callback: (manager: unknown) => unknown) =>
      callback({}),
    ),
  };

  const useCase = new VacancyPromotionUseCase(
    billing as never,
    plans as never,
    {} as never,
    {} as never,
    ownership as never,
    audit as never,
    {} as never,
    entitlements as never,
    vacancies as never,
    dataSource as never,
  );

  const actor = { userId: 'user-1', ip: '127.0.0.1', userAgent: 'jest' };
  const subscription = {
    id: 'sub-1',
    companyId: 'company-1',
    planId: 'plan-1',
    status: 'ACTIVE',
    promotionCredits: 0,
    usedPromotionCredits: 0,
    currentPeriodEnd: future,
  } as unknown as CompanySubscription;

  beforeEach(() => {
    jest.clearAllMocks();
    ownership.requireCompany.mockResolvedValue({ id: 'company-1' });
    ownership.requireOwnVacancy.mockResolvedValue({
      id: 'vac-1',
      title: 'Desarrollador',
      status: VacancyStatus.ACTIVE,
      expiresAt: future,
    } as unknown as Vacancy);
    plans.findById.mockResolvedValue({
      id: 'plan-1',
      name: 'Básico',
      code: 'BASICO',
      validityDays: 30,
      currency: 'MXN',
    });
    entitlements.resolve.mockResolvedValue({
      promotionCredits: 1,
      promotionDays: 7,
      publicationDays: 30,
    });
    entitlements.applyToVacancy.mockResolvedValue({
      vacancy: null,
      endsAt: future,
    });
    billing.findLivePromotionByVacancy.mockResolvedValue(null);
    billing.findLiveSubscriptionByCompany.mockResolvedValue(subscription);
    billing.saveSubscription.mockImplementation((row) => Promise.resolve(row));
    billing.savePromotion.mockImplementation((row) => {
      row.id = 'promo-1';
      row.createdAt = new Date();
      return Promise.resolve(row);
    });
    vacancies.findById.mockResolvedValue({
      id: 'vac-1',
      title: 'Desarrollador',
    });
  });

  it('el resumen toma incluidas y duración del plan, no de la caché', async () => {
    billing.findAndCountPromotionsByCompany.mockResolvedValue([[], 0]);

    const summary = await useCase.summary(actor);

    expect(summary.promotionsIncluded).toBe(1);
    expect(summary.promotionsUsed).toBe(0);
    expect(summary.promotionsAvailable).toBe(1);
    expect(summary.promotionDurationDays).toBe(7);
  });

  it('activa con un cupo, bloquea la suscripción y calcula 7 días', async () => {
    const result = await useCase.create('vac-1', undefined, true, actor);

    expect(billing.findLiveSubscriptionByCompany).toHaveBeenCalledWith(
      'company-1',
      expect.any(Date),
      expect.anything(),
      true,
    );
    expect(billing.saveSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        promotionCredits: 1,
        usedPromotionCredits: 1,
      }),
      expect.anything(),
    );
    expect(result.status).toBe(PromotionStatus.ACTIVE);
    expect(result.vacancyTitle).toBe('Desarrollador');

    const endsAt = new Date(result.endsAt!);
    const days = Math.round(
      (endsAt.getTime() - new Date(result.startsAt!).getTime()) /
        (24 * 60 * 60 * 1000),
    );
    expect(days).toBe(7);
  });

  it('rechaza activar si el plan ya no tiene cupos', async () => {
    entitlements.resolve.mockResolvedValueOnce({
      promotionCredits: 1,
      promotionDays: 7,
      publicationDays: 30,
    });
    billing.findLiveSubscriptionByCompany.mockResolvedValueOnce({
      ...subscription,
      usedPromotionCredits: 1,
    });

    await expect(
      useCase.create('vac-1', undefined, true, actor),
    ).rejects.toThrow('No tienes créditos de promoción disponibles');
  });
});
