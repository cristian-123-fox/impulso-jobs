import { Inject, Injectable, Logger } from '@nestjs/common';
import { AuditService } from '@/modules/audit/audit.service';
import { CompanySubscription } from '@/modules/billing/entities/company-subscription.entity';
import { SubscriptionNotice } from '@/modules/billing/entities/subscription-notice.entity';
import { subscriptionExpiryNoticeDays } from '@/modules/billing/enums/billing.enums';
import {
  type IBillingRepository,
  BILLING_REPOSITORY,
} from '@/modules/billing/repositories/billing.repository.interface';
import {
  type IPlanRepository,
  PLAN_REPOSITORY,
} from '@/modules/billing/repositories/plan.repository.interface';
import { CompanyMemberRole } from '@/modules/companies/enums/company-member-role.enum';
import {
  type ICompanyUserRepository,
  COMPANY_USER_REPOSITORY,
} from '@/modules/companies/repositories/company-user.repository.interface';
import {
  type IUserRepository,
  USER_REPOSITORY,
} from '@/modules/iam/users/repositories/user.repository.interface';
import { NotificationType } from '@/modules/notifications/enums/notification-type.enum';
import { NotificationService } from '@/modules/notifications/services/notification.service';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Quién recibe el aviso: los que pueden pagar la renovación. */
const NOTIFIED_MEMBER_ROLES = [
  CompanyMemberRole.OWNER,
  CompanyMemberRole.ADMIN,
];

export interface SubscriptionNoticeSummary {
  checked: number;
  /** `subscriptionId:umbral` de cada aviso emitido en esta pasada. */
  notified: string[];
}

/**
 * T22: avisa a la empresa antes de que venza su suscripción, en los umbrales
 * de `SUBSCRIPTION_EXPIRY_NOTICE_DAYS` (por defecto 30, 7 y 1 días).
 *
 * **Idempotencia.** El job corre a diario, así que sin acuse reenviaría el
 * mismo correo cada día dentro del umbral. Cada envío deja una fila en
 * `subscription_notices`, con único `(suscripción, fin de periodo, umbral)`;
 * `period_end` entra en la clave para que una renovación vuelva a avisar.
 *
 * Al disparar un umbral se marcan también **los mayores**: si el primer aviso
 * se manda a 7 días, el de 30 ya no tiene sentido y no debe saltar al día
 * siguiente (cuando `daysLeft` baje a 6, seguiría cumpliendo `6 <= 30`).
 */
@Injectable()
export class NotifySubscriptionExpiryUseCase {
  private readonly logger = new Logger(NotifySubscriptionExpiryUseCase.name);

  constructor(
    @Inject(BILLING_REPOSITORY) private readonly billing: IBillingRepository,
    @Inject(PLAN_REPOSITORY) private readonly plans: IPlanRepository,
    @Inject(COMPANY_USER_REPOSITORY)
    private readonly companyUsers: ICompanyUserRepository,
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    private readonly notifications: NotificationService,
    private readonly audit: AuditService,
  ) {}

  async execute(now = new Date()): Promise<SubscriptionNoticeSummary> {
    const thresholds = subscriptionExpiryNoticeDays();
    if (thresholds.length === 0) {
      this.logger.log('Avisos de vencimiento desactivados por configuración.');
      return { checked: 0, notified: [] };
    }

    const horizon = new Date(now.getTime() + thresholds[0] * DAY_MS);
    const due = await this.billing.findSubscriptionsExpiringBefore(
      now,
      horizon,
    );

    const notified: string[] = [];
    for (const subscription of due) {
      // Una suscripción por iteración: si una falla, las demás siguen.
      try {
        const threshold = await this.claimThreshold(
          subscription,
          thresholds,
          now,
        );
        if (threshold === null) continue;

        await this.notifyCompany(subscription, threshold);
        notified.push(`${subscription.id}:${threshold}`);
      } catch (error) {
        this.logger.error(
          `No se pudo avisar del vencimiento de ${subscription.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    return { checked: due.length, notified };
  }

  /**
   * Reserva el umbral que toca, o `null` si ya se avisó. El acuse se escribe
   * **antes** de notificar: preferimos perder un aviso ante una caída que
   * mandarlo dos veces.
   */
  private async claimThreshold(
    subscription: CompanySubscription,
    thresholds: number[],
    now: Date,
  ): Promise<number | null> {
    const periodEnd = subscription.currentPeriodEnd;
    if (!periodEnd) return null;

    const daysLeft = Math.ceil((periodEnd.getTime() - now.getTime()) / DAY_MS);
    // `thresholds` viene de mayor a menor: el último que cumple es el más
    // urgente, y es el que se comunica.
    const matching = thresholds.filter((value) => daysLeft <= value);
    if (matching.length === 0) return null;

    const target = matching[matching.length - 1];
    const isFirst = await this.billing.registerSubscriptionNoticeOnce(
      this.noticeFor(subscription, target, periodEnd, now),
    );
    if (!isFirst) return null;

    // Los umbrales mayores quedan consumidos: ya se avisó, y más tarde.
    for (const value of matching) {
      if (value === target) continue;
      await this.billing.registerSubscriptionNoticeOnce(
        this.noticeFor(subscription, value, periodEnd, now),
      );
    }

    return target;
  }

  private noticeFor(
    subscription: CompanySubscription,
    thresholdDays: number,
    periodEnd: Date,
    now: Date,
  ): SubscriptionNotice {
    const notice = new SubscriptionNotice();
    notice.subscriptionId = subscription.id;
    notice.companyId = subscription.companyId;
    notice.thresholdDays = thresholdDays;
    notice.periodEnd = periodEnd;
    notice.sentAt = now;
    return notice;
  }

  private async notifyCompany(
    subscription: CompanySubscription,
    thresholdDays: number,
  ): Promise<void> {
    const plan = await this.plans.findById(subscription.planId);
    const planName = plan?.name ?? 'tu plan';
    const endsOn = formatDate(subscription.currentPeriodEnd);

    const title = 'Tu plan está por vencer';
    const body =
      `La suscripción ${planName} de tu empresa vence el ${endsOn} ` +
      `(${thresholdDays === 1 ? 'mañana' : `en ${thresholdDays} días`}). ` +
      'Renuévala para no perder los beneficios del plan.';
    const link = '/empresa/promociones';

    const recipients = await this.recipients(subscription.companyId);
    for (const user of recipients) {
      await this.notifications.notify({
        userId: user.id,
        type: NotificationType.SUBSCRIPTION_EXPIRING,
        title,
        body,
        link,
        sendEmail: true,
      });
      await this.notifications.sendNotificationEmail(
        user.email,
        title,
        body,
        link,
      );
    }

    await this.audit.record({
      action: 'subscriptions.expiry_notice',
      entity: 'company_subscription',
      entityId: subscription.id,
      metadata: {
        companyId: subscription.companyId,
        thresholdDays,
        currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
        recipients: recipients.length,
      },
    });
  }

  /**
   * Quien manda en la empresa (OWNER/ADMIN). Si no hay ninguno —datos viejos
   * o equipo mal formado— se avisa a todo el equipo antes que a nadie.
   */
  private async recipients(
    companyId: string,
  ): Promise<{ id: string; email: string }[]> {
    const members = await this.companyUsers.findByCompanyId(companyId);
    if (members.length === 0) return [];

    const managers = members.filter((member) =>
      NOTIFIED_MEMBER_ROLES.includes(member.role),
    );
    const targets = managers.length > 0 ? managers : members;

    const resolved: { id: string; email: string }[] = [];
    for (const member of targets) {
      const user = await this.users.findById(member.userId);
      if (user) resolved.push({ id: user.id, email: user.email });
    }
    return resolved;
  }
}

function formatDate(value: Date | null | undefined): string {
  if (!value) return 'pronto';
  return value.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}
