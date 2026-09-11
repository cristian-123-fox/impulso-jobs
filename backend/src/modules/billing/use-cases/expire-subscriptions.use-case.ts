import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { runInTransaction } from '@/common/utils/transaction.util';
import { AuditService } from '@/modules/audit/audit.service';
import { SubscriptionStatus } from '@/modules/billing/enums/billing.enums';
import {
  type IBillingRepository,
  BILLING_REPOSITORY,
} from '@/modules/billing/repositories/billing.repository.interface';

export interface SubscriptionExpirationSummary {
  checked: number;
  expired: string[];
}

/**
 * T22: caduca las suscripciones cuyo periodo pagado ya venció.
 *
 * **Sólo cambia el estado y audita** (decisión N8). No hay nada más que
 * apagar: el cupo de la base de talento ya muere solo —el grant se guarda con
 * `expiresAt = currentPeriodEnd` y `findActiveGrants` filtra por fecha— y los
 * distintivos de vacante los otorgan las *promociones*, no la suscripción.
 * Los datos se conservan: vacantes publicadas, postulaciones recibidas y CVs
 * ya desbloqueados siguen accesibles.
 *
 * Lo que sí arregla es el bloqueo real: mientras la fila seguía en ACTIVE,
 * `findLiveSubscriptionByCompany` la devolvía y la empresa **no podía volver a
 * suscribirse** (`SUBSCRIPTION_ALREADY_EXISTS`).
 *
 * Se invoca desde `pnpm billing:expire`, junto a la expiración de promociones.
 */
@Injectable()
export class ExpireSubscriptionsUseCase {
  private readonly logger = new Logger(ExpireSubscriptionsUseCase.name);

  constructor(
    @Inject(BILLING_REPOSITORY) private readonly billing: IBillingRepository,
    private readonly audit: AuditService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async execute(now = new Date()): Promise<SubscriptionExpirationSummary> {
    const due = await this.billing.findExpiredActiveSubscriptions(now);
    if (due.length === 0) {
      return { checked: 0, expired: [] };
    }

    const expired: string[] = [];
    for (const subscription of due) {
      // Una suscripción por transacción: si una falla, las demás siguen.
      try {
        await runInTransaction(this.dataSource, async (manager) => {
          subscription.status = SubscriptionStatus.EXPIRED;
          await this.billing.saveSubscription(subscription, manager);
        });

        await this.audit.record({
          action: 'subscriptions.expire',
          entity: 'company_subscription',
          entityId: subscription.id,
          metadata: {
            companyId: subscription.companyId,
            planId: subscription.planId,
            currentPeriodEnd:
              subscription.currentPeriodEnd?.toISOString() ?? null,
            autoRenew: subscription.autoRenew,
          },
        });
        expired.push(subscription.id);
      } catch (error) {
        this.logger.error(
          `No se pudo expirar la suscripción ${subscription.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    return { checked: due.length, expired };
  }
}
