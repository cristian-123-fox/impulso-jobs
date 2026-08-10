import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { runInTransaction } from '@/common/utils/transaction.util';
import { TalentAccessView } from '@/modules/talent/entities/talent-access-view.entity';
import { UNLIMITED_VISITS } from '@/modules/talent/enums/talent-access.enum';
import {
  type ITalentAccessRepository,
  TALENT_ACCESS_REPOSITORY,
} from '@/modules/talent/repositories/talent-access.repository.interface';

/** Estado del cupo de una empresa, para pintarlo en la UI. */
export interface TalentQuotaSummary {
  /** `-1` si algún cupo vigente es ilimitado. */
  totalVisits: number;
  usedVisits: number;
  /** `-1` = ilimitado. Nunca negativo por otra razón. */
  remainingVisits: number;
  unlimited: boolean;
}

/** Resultado de consumir (o no) una visita. */
export interface TalentQuotaConsumption {
  /** `true` si esta consulta descontó cupo; `false` si ya estaba pagada. */
  charged: boolean;
  quota: TalentQuotaSummary;
}

/**
 * Cupo de visitas a la base de talento (HU-016).
 *
 * Reglas:
 * - Un CV ya consultado por la empresa **no vuelve a cobrar**: la primera vez
 *   se descuenta y queda registrado en `talent_access_views`.
 * - Se consume el cupo que caduca antes, para no desperdiciarlo.
 * - Sin cupo disponible se bloquea con `TALENT_QUOTA_EXHAUSTED` (402) y un
 *   mensaje de upsell.
 *
 * Los cupos los **crea M14** al activar un plan. Hoy no existe ninguno, así
 * que toda empresa tiene 0 visitas — el bloqueo es el comportamiento correcto
 * para una cuenta sin plan.
 */
@Injectable()
export class TalentQuotaService {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(TALENT_ACCESS_REPOSITORY)
    private readonly access: ITalentAccessRepository,
  ) {}

  /** Estado del cupo sin consumirlo. */
  async summary(
    companyId: string,
    now = new Date(),
  ): Promise<TalentQuotaSummary> {
    const grants = await this.access.findActiveGrants(companyId, now);
    return this.summarize(grants);
  }

  /**
   * Descuenta una visita por consultar el CV de un candidato de la base de
   * talento. Idempotente por (empresa, candidato).
   */
  async consume(
    companyId: string,
    candidateProfileId: string,
    now = new Date(),
  ): Promise<TalentQuotaConsumption> {
    const alreadyViewed = await this.access.findView(
      companyId,
      candidateProfileId,
    );
    if (alreadyViewed) {
      return { charged: false, quota: await this.summary(companyId, now) };
    }

    return runInTransaction(this.dataSource, async (manager) => {
      // Se relee dentro de la transacción: entre la comprobación de arriba y
      // este punto otra petición pudo consumir la última visita.
      const repeated = await this.access.findView(
        companyId,
        candidateProfileId,
        manager,
      );
      const grants = await this.access.findActiveGrants(
        companyId,
        now,
        manager,
      );
      if (repeated) {
        return { charged: false, quota: this.summarize(grants) };
      }

      const usable = grants.find(
        (grant) =>
          grant.totalVisits === UNLIMITED_VISITS ||
          grant.usedVisits < grant.totalVisits,
      );
      if (!usable) {
        throw new AppException(
          HttpStatus.PAYMENT_REQUIRED,
          ErrorCode.TALENT_QUOTA_EXHAUSTED,
          'Agotaste las visitas a la base de talento de tu plan. Mejora tu plan para seguir consultando hojas de vida.',
        );
      }

      if (usable.totalVisits !== UNLIMITED_VISITS) {
        usable.usedVisits += 1;
        await this.access.saveGrant(usable, manager);
      }

      const view = new TalentAccessView();
      view.companyId = companyId;
      view.candidateProfileId = candidateProfileId;
      view.grantId = usable.id;
      view.viewedAt = now;
      await this.access.saveView(view, manager);

      return { charged: true, quota: this.summarize(grants) };
    });
  }

  private summarize(
    grants: readonly { totalVisits: number; usedVisits: number }[],
  ): TalentQuotaSummary {
    const unlimited = grants.some(
      (grant) => grant.totalVisits === UNLIMITED_VISITS,
    );
    const limited = grants.filter(
      (grant) => grant.totalVisits !== UNLIMITED_VISITS,
    );

    const totalVisits = limited.reduce((sum, g) => sum + g.totalVisits, 0);
    const usedVisits = grants.reduce((sum, g) => sum + g.usedVisits, 0);

    return {
      totalVisits: unlimited ? UNLIMITED_VISITS : totalVisits,
      usedVisits,
      remainingVisits: unlimited
        ? UNLIMITED_VISITS
        : Math.max(0, totalVisits - usedVisits),
      unlimited,
    };
  }
}
