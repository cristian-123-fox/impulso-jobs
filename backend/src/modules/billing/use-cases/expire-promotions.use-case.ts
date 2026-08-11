import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { runInTransaction } from '@/common/utils/transaction.util';
import { AuditService } from '@/modules/audit/audit.service';
import { PromotionStatus } from '@/modules/billing/enums/billing.enums';
import {
  type IBillingRepository,
  BILLING_REPOSITORY,
} from '@/modules/billing/repositories/billing.repository.interface';
import { EntitlementService } from '@/modules/billing/services/entitlement.service';

export interface ExpirationSummary {
  checked: number;
  expired: string[];
}

/**
 * Caduca las promociones vencidas y revierte los distintivos de sus vacantes.
 *
 * No hay planificador instalado (`@nestjs/schedule` no es dependencia del
 * proyecto), así que se invoca desde `pnpm billing:expire`, igual que
 * `purge:accounts`. En cPanel se engancha a un cron del servidor.
 */
@Injectable()
export class ExpirePromotionsUseCase {
  private readonly logger = new Logger(ExpirePromotionsUseCase.name);

  constructor(
    @Inject(BILLING_REPOSITORY) private readonly billing: IBillingRepository,
    private readonly entitlements: EntitlementService,
    private readonly audit: AuditService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async execute(now = new Date()): Promise<ExpirationSummary> {
    const due = await this.billing.findExpiredActivePromotions(now);
    if (due.length === 0) {
      return { checked: 0, expired: [] };
    }

    const expired: string[] = [];
    for (const promotion of due) {
      // Una promoción por transacción: si una falla, las demás siguen.
      try {
        await runInTransaction(this.dataSource, async (manager) => {
          promotion.status = PromotionStatus.EXPIRED;
          await this.billing.savePromotion(promotion, manager);
          await this.entitlements.revokeFromVacancy(
            promotion.vacancyId,
            manager,
          );
        });

        await this.audit.record({
          action: 'promotions.expire',
          entity: 'vacancy_promotion',
          entityId: promotion.id,
          metadata: {
            vacancyId: promotion.vacancyId,
            endsAt: promotion.endsAt?.toISOString() ?? null,
          },
        });
        expired.push(promotion.id);
      } catch (error) {
        this.logger.error(
          `No se pudo expirar la promoción ${promotion.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    return { checked: due.length, expired };
  }
}
