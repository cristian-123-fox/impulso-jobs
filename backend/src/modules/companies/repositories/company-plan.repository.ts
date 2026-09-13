import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, MoreThan, Repository } from 'typeorm';
import { CompanySubscription } from '@/modules/billing/entities/company-subscription.entity';
import { Plan } from '@/modules/billing/entities/plan.entity';
import { SubscriptionStatus } from '@/modules/billing/enums/billing.enums';
import {
  CompanyPlanSummary,
  ICompanyPlanRepository,
} from '@/modules/companies/repositories/company-plan.repository.interface';

/**
 * Mismos estados que `BillingRepository.findLiveSubscriptionByCompany`: lo que
 * el back-office muestra tiene que coincidir con lo que billing considera
 * vigente, o el admin vería un plan que la empresa no tiene.
 */
const LIVE_STATUSES = [
  SubscriptionStatus.PENDING_PAYMENT,
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.PAST_DUE,
];

@Injectable()
export class CompanyPlanRepository implements ICompanyPlanRepository {
  constructor(
    @InjectRepository(CompanySubscription)
    private readonly subscriptions: Repository<CompanySubscription>,
    @InjectRepository(Plan)
    private readonly plans: Repository<Plan>,
  ) {}

  async findLiveByCompanyIds(
    companyIds: string[],
    now: Date,
  ): Promise<Map<string, CompanyPlanSummary>> {
    if (companyIds.length === 0) return new Map();

    // El fin de periodo entra en el filtro igual que en billing: hasta que
    // corre el job de expiración, una vencida sigue en ACTIVE.
    const base = { companyId: In(companyIds), status: In(LIVE_STATUSES) };
    const rows = await this.subscriptions.find({
      where: [
        { ...base, currentPeriodEnd: IsNull() },
        { ...base, currentPeriodEnd: MoreThan(now) },
      ],
      order: { createdAt: 'DESC' },
    });
    if (rows.length === 0) return new Map();

    // Vienen de la más reciente a la más vieja: la primera de cada empresa es
    // la que manda, igual que hace `findLiveSubscriptionByCompany`.
    const latest = new Map<string, CompanySubscription>();
    for (const row of rows) {
      if (!latest.has(row.companyId)) latest.set(row.companyId, row);
    }

    const planIds = [...new Set([...latest.values()].map((s) => s.planId))];
    const plans = await this.plans.find({ where: { id: In(planIds) } });
    const planById = new Map(plans.map((plan) => [plan.id, plan]));

    const summaries = new Map<string, CompanyPlanSummary>();
    for (const [companyId, subscription] of latest) {
      const plan = planById.get(subscription.planId);
      summaries.set(companyId, {
        subscriptionId: subscription.id,
        planId: subscription.planId,
        planName: plan?.name ?? null,
        planCode: plan?.code ?? null,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd ?? null,
        autoRenew: subscription.autoRenew,
      });
    }
    return summaries;
  }
}
