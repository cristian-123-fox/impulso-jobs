import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityManager,
  In,
  IsNull,
  MoreThan,
  Repository,
} from 'typeorm';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { CompanySubscription } from '@/modules/billing/entities/company-subscription.entity';
import { Plan } from '@/modules/billing/entities/plan.entity';
import { SubscriptionStatus } from '@/modules/billing/enums/billing.enums';

/**
 * Estados que cuentan como plan vigente. Espeja `findLiveSubscriptionByCompany`
 * de billing: una suscripción vencida sigue en ACTIVE hasta que corre el cron.
 */
const LIVE_STATUSES = [
  SubscriptionStatus.PENDING_PAYMENT,
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.PAST_DUE,
];

export interface PublicationQuotaResult {
  readonly plan: Plan;
  readonly periodEnd: Date | null;
}

/**
 * Consume una publicación del plan vigente de la empresa.
 *
 * Vive en `vacancies` y no en `billing` a propósito: M14 (billing) ya importa
 * `VacanciesModule`, así que inyectar el repositorio de billing aquí cerraría
 * un ciclo de DI. Accede a las entidades por `TypeORM` directamente, igual que
 * `CompanyPlanRepository`.
 *
 * `postingCredits < 0` significa **ilimitadas** (convención que ya usa
 * `talent_db_access = -1`). Si es 0 o positivo, se descuenta una.
 *
 * Debe llamarse **dentro** de la transacción que crea la vacante y con el
 * bloqueo `pessimistic_write`: dos peticiones simultáneas no pueden gastar el
 * último cupo dos veces.
 */
@Injectable()
export class PublicationQuotaService {
  constructor(
    @InjectRepository(CompanySubscription)
    private readonly subscriptions: Repository<CompanySubscription>,
  ) {}

  async consume(
    companyId: string,
    now: Date,
    manager: EntityManager,
  ): Promise<PublicationQuotaResult> {
    const repo = manager.getRepository(CompanySubscription);
    const subscription = await repo.findOne({
      where: [
        { companyId, status: In(LIVE_STATUSES), currentPeriodEnd: IsNull() },
        {
          companyId,
          status: In(LIVE_STATUSES),
          currentPeriodEnd: MoreThan(now),
        },
      ],
      order: { createdAt: 'DESC' },
      lock: { mode: 'pessimistic_write' },
    });

    if (!subscription) {
      throw new AppException(
        HttpStatus.PAYMENT_REQUIRED,
        ErrorCode.PUBLICATION_CREDIT_REQUIRED,
        'Necesitas un plan activo para publicar una vacante. Compra uno para continuar.',
      );
    }

    const included = subscription.postingCredits ?? 0;
    const used = subscription.usedPostingCredits ?? 0;
    // -1 = ilimitadas. En cualquier otro caso, un cupo por publicación.
    if (included >= 0 && used >= included) {
      throw new AppException(
        HttpStatus.PAYMENT_REQUIRED,
        ErrorCode.PUBLICATION_CREDIT_REQUIRED,
        'Ya usaste las publicaciones incluidas en tu plan. Compra otro plan para publicar más vacantes.',
      );
    }

    subscription.usedPostingCredits = used + 1;
    await repo.save(subscription);

    const plan = await manager.getRepository(Plan).findOne({
      where: { id: subscription.planId },
    });
    if (!plan) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.PLAN_NOT_FOUND,
        'El plan de tu empresa ya no existe.',
      );
    }

    return { plan, periodEnd: subscription.currentPeriodEnd ?? null };
  }
}
