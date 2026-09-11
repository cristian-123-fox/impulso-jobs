import { AuditService } from '@/modules/audit/audit.service';
import { CompanySubscription } from '@/modules/billing/entities/company-subscription.entity';
import { SubscriptionNotice } from '@/modules/billing/entities/subscription-notice.entity';
import { SubscriptionStatus } from '@/modules/billing/enums/billing.enums';
import { IBillingRepository } from '@/modules/billing/repositories/billing.repository.interface';
import { IPlanRepository } from '@/modules/billing/repositories/plan.repository.interface';
import { CompanyUser } from '@/modules/companies/entities/company-user.entity';
import { CompanyMemberRole } from '@/modules/companies/enums/company-member-role.enum';
import { ICompanyUserRepository } from '@/modules/companies/repositories/company-user.repository.interface';
import { User } from '@/modules/iam/users/entities/user.entity';
import { IUserRepository } from '@/modules/iam/users/repositories/user.repository.interface';
import { NotificationType } from '@/modules/notifications/enums/notification-type.enum';
import { NotificationService } from '@/modules/notifications/services/notification.service';
import { NotifySubscriptionExpiryUseCase } from '@/modules/billing/use-cases/notify-subscription-expiry.use-case';

const NOW = new Date('2026-09-11T12:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;

function subscriptionEndingIn(days: number): CompanySubscription {
  return Object.assign(new CompanySubscription(), {
    id: 'sub-1',
    companyId: 'company-1',
    planId: 'plan-1',
    status: SubscriptionStatus.ACTIVE,
    currentPeriodEnd: new Date(NOW.getTime() + days * DAY),
    autoRenew: true,
  });
}

function member(userId: string, role: CompanyMemberRole): CompanyUser {
  return Object.assign(new CompanyUser(), {
    companyId: 'company-1',
    userId,
    role,
  });
}

describe('NotifySubscriptionExpiryUseCase', () => {
  let billing: jest.Mocked<IBillingRepository>;
  let plans: jest.Mocked<IPlanRepository>;
  let companyUsers: jest.Mocked<ICompanyUserRepository>;
  let users: jest.Mocked<IUserRepository>;
  let notifications: jest.Mocked<NotificationService>;
  let audit: jest.Mocked<AuditService>;
  let useCase: NotifySubscriptionExpiryUseCase;
  /** Umbrales ya reservados, para simular el índice único de la tabla. */
  let claimed: Set<string>;

  beforeEach(() => {
    process.env.SUBSCRIPTION_EXPIRY_NOTICE_DAYS = '30,7,1';
    claimed = new Set<string>();

    billing = {
      findSubscriptionsExpiringBefore: jest.fn().mockResolvedValue([]),
      registerSubscriptionNoticeOnce: jest.fn((notice: SubscriptionNotice) => {
        const key = `${notice.subscriptionId}:${notice.periodEnd.toISOString()}:${notice.thresholdDays}`;
        if (claimed.has(key)) return Promise.resolve(false);
        claimed.add(key);
        return Promise.resolve(true);
      }),
    } as unknown as jest.Mocked<IBillingRepository>;

    plans = {
      findById: jest.fn().mockResolvedValue({ name: 'Anual' }),
    } as unknown as jest.Mocked<IPlanRepository>;

    companyUsers = {
      findByCompanyId: jest
        .fn()
        .mockResolvedValue([
          member('user-owner', CompanyMemberRole.OWNER),
          member('user-recruiter', CompanyMemberRole.RECRUITER),
        ]),
    } as unknown as jest.Mocked<ICompanyUserRepository>;

    users = {
      findById: jest.fn((id: string) =>
        Promise.resolve(
          Object.assign(new User(), { id, email: `${id}@example.com` }),
        ),
      ),
    } as unknown as jest.Mocked<IUserRepository>;

    notifications = {
      notify: jest.fn().mockResolvedValue(undefined),
      sendNotificationEmail: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<NotificationService>;

    audit = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;

    useCase = new NotifySubscriptionExpiryUseCase(
      billing,
      plans,
      companyUsers,
      users,
      notifications,
      audit,
    );
  });

  afterEach(() => {
    delete process.env.SUBSCRIPTION_EXPIRY_NOTICE_DAYS;
  });

  it('avisa sólo al OWNER/ADMIN, no a todo el equipo', async () => {
    billing.findSubscriptionsExpiringBefore.mockResolvedValue([
      subscriptionEndingIn(7),
    ]);

    const summary = await useCase.execute(NOW);

    expect(summary).toEqual({ checked: 1, notified: ['sub-1:7'] });
    expect(notifications.notify).toHaveBeenCalledTimes(1);
    expect(notifications.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-owner',
        type: NotificationType.SUBSCRIPTION_EXPIRING,
        sendEmail: true,
      }),
    );
    expect(notifications.sendNotificationEmail).toHaveBeenCalledWith(
      'user-owner@example.com',
      expect.any(String),
      expect.any(String),
      '/empresa/promociones',
    );
  });

  it('elige el umbral más urgente que aplica', async () => {
    billing.findSubscriptionsExpiringBefore.mockResolvedValue([
      subscriptionEndingIn(1),
    ]);

    const summary = await useCase.execute(NOW);

    // A 1 día aplican 30, 7 y 1: debe comunicarse el 1, no tres avisos.
    expect(summary.notified).toEqual(['sub-1:1']);
    expect(notifications.notify).toHaveBeenCalledTimes(1);
  });

  it('no reenvía el mismo umbral aunque el job corra a diario', async () => {
    const due = subscriptionEndingIn(7);
    billing.findSubscriptionsExpiringBefore.mockResolvedValue([due]);
    await useCase.execute(NOW);
    notifications.notify.mockClear();

    // Día siguiente: quedan 6 días, sigue dentro del umbral de 7 (y de 30).
    const tomorrow = new Date(NOW.getTime() + DAY);
    const summary = await useCase.execute(tomorrow);

    expect(summary.notified).toEqual([]);
    expect(notifications.notify).not.toHaveBeenCalled();
  });

  it('tras avisar a 7 días, todavía avisa al llegar a 1', async () => {
    const due = subscriptionEndingIn(7);
    billing.findSubscriptionsExpiringBefore.mockResolvedValue([due]);
    await useCase.execute(NOW);
    notifications.notify.mockClear();

    const sixDaysLater = new Date(NOW.getTime() + 6 * DAY);
    const summary = await useCase.execute(sixDaysLater);

    expect(summary.notified).toEqual(['sub-1:1']);
    expect(notifications.notify).toHaveBeenCalledTimes(1);
  });

  it('una lista vacía desactiva los avisos', async () => {
    process.env.SUBSCRIPTION_EXPIRY_NOTICE_DAYS = '';

    await expect(useCase.execute(NOW)).resolves.toEqual({
      checked: 0,
      notified: [],
    });
    expect(billing.findSubscriptionsExpiringBefore).not.toHaveBeenCalled();
  });

  it('si la empresa no tiene OWNER/ADMIN, avisa a todo el equipo', async () => {
    companyUsers.findByCompanyId.mockResolvedValue([
      member('user-recruiter', CompanyMemberRole.RECRUITER),
      member('user-member', CompanyMemberRole.MEMBER),
    ]);
    billing.findSubscriptionsExpiringBefore.mockResolvedValue([
      subscriptionEndingIn(1),
    ]);

    await useCase.execute(NOW);

    expect(notifications.notify).toHaveBeenCalledTimes(2);
  });

  it('un fallo en una suscripción no detiene el lote', async () => {
    const first = subscriptionEndingIn(7);
    const second = Object.assign(subscriptionEndingIn(7), { id: 'sub-2' });
    billing.findSubscriptionsExpiringBefore.mockResolvedValue([first, second]);
    notifications.notify.mockRejectedValueOnce(new Error('BD caída'));

    const summary = await useCase.execute(NOW);

    expect(summary).toEqual({ checked: 2, notified: ['sub-2:7'] });
  });
});
