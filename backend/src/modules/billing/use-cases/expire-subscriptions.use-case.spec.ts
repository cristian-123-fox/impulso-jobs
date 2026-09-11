import { DataSource } from 'typeorm';
import { AuditService } from '@/modules/audit/audit.service';
import { CompanySubscription } from '@/modules/billing/entities/company-subscription.entity';
import { SubscriptionStatus } from '@/modules/billing/enums/billing.enums';
import { IBillingRepository } from '@/modules/billing/repositories/billing.repository.interface';
import { ExpireSubscriptionsUseCase } from '@/modules/billing/use-cases/expire-subscriptions.use-case';

const NOW = new Date('2026-09-11T12:00:00.000Z');

function subscription(id: string, periodEnd: Date): CompanySubscription {
  return Object.assign(new CompanySubscription(), {
    id,
    companyId: 'company-1',
    planId: 'plan-1',
    status: SubscriptionStatus.ACTIVE,
    currentPeriodEnd: periodEnd,
    autoRenew: true,
  });
}

describe('ExpireSubscriptionsUseCase', () => {
  let dataSource: DataSource;
  let billing: jest.Mocked<IBillingRepository>;
  let audit: jest.Mocked<AuditService>;
  let useCase: ExpireSubscriptionsUseCase;

  beforeEach(() => {
    dataSource = {
      transaction: jest.fn((work: (m: unknown) => Promise<unknown>) =>
        work({}),
      ),
    } as unknown as DataSource;

    billing = {
      findExpiredActiveSubscriptions: jest.fn().mockResolvedValue([]),
      saveSubscription: jest.fn((sub: CompanySubscription) =>
        Promise.resolve(sub),
      ),
    } as unknown as jest.Mocked<IBillingRepository>;

    audit = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;

    useCase = new ExpireSubscriptionsUseCase(billing, audit, dataSource);
  });

  it('no hace nada si no hay suscripciones vencidas', async () => {
    await expect(useCase.execute(NOW)).resolves.toEqual({
      checked: 0,
      expired: [],
    });
    expect(billing.saveSubscription).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('marca EXPIRED la suscripción vencida y la audita', async () => {
    const due = subscription('sub-1', new Date('2026-09-10T00:00:00.000Z'));
    billing.findExpiredActiveSubscriptions.mockResolvedValue([due]);

    const summary = await useCase.execute(NOW);

    expect(summary).toEqual({ checked: 1, expired: ['sub-1'] });
    expect(due.status).toBe(SubscriptionStatus.EXPIRED);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'subscriptions.expire',
        entity: 'company_subscription',
        entityId: 'sub-1',
      }),
    );
  });

  it('un fallo no detiene el lote', async () => {
    const first = subscription('sub-1', new Date('2026-09-01T00:00:00.000Z'));
    const second = subscription('sub-2', new Date('2026-09-02T00:00:00.000Z'));
    billing.findExpiredActiveSubscriptions.mockResolvedValue([first, second]);
    billing.saveSubscription
      .mockRejectedValueOnce(new Error('BD caída'))
      .mockImplementation((sub: CompanySubscription) => Promise.resolve(sub));

    const summary = await useCase.execute(NOW);

    expect(summary).toEqual({ checked: 2, expired: ['sub-2'] });
    expect(second.status).toBe(SubscriptionStatus.EXPIRED);
  });
});
