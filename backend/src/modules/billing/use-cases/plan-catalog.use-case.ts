import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { AuditService } from '@/modules/audit/audit.service';
import {
  PlanFeatureResponseDto,
  PlanResponseDto,
  toPlanFeatureResponse,
  toPlanResponse,
} from '@/modules/billing/dto/billing-response.dto';
import {
  PlanFeatureValueDto,
  SavePlanDto,
  SavePlanFeatureDto,
} from '@/modules/billing/dto/billing.dto';
import { PlanFeatureValue } from '@/modules/billing/entities/plan-feature-value.entity';
import { PlanFeature } from '@/modules/billing/entities/plan-feature.entity';
import { Plan } from '@/modules/billing/entities/plan.entity';
import {
  BILLING_CURRENCY,
  MX_TAX_RATE,
  PlanType,
} from '@/modules/billing/enums/billing.enums';
import {
  type IPlanRepository,
  PLAN_REPOSITORY,
} from '@/modules/billing/repositories/plan.repository.interface';
import { PricingService } from '@/modules/billing/services/pricing.service';

export interface BillingActor {
  userId: string;
  ip: string;
  userAgent: string;
}

/**
 * Catálogo de planes y beneficios.
 *
 * `list(onlyActive)` sirve tanto al portal público (`GET /plans`, sólo activos)
 * como al back-office (`GET /admin/plans`, todos). El desglose de IVA y los
 * métodos de pago disponibles se calculan al vuelo: la tarjeta de precios sale
 * directamente de aquí.
 */
@Injectable()
export class PlanCatalogUseCase {
  constructor(
    @Inject(PLAN_REPOSITORY) private readonly plans: IPlanRepository,
    private readonly pricing: PricingService,
    private readonly audit: AuditService,
  ) {}

  async list(onlyActive: boolean): Promise<PlanResponseDto[]> {
    const [rows, catalog] = await Promise.all([
      this.plans.findAll(onlyActive),
      this.plans.findFeatures(),
    ]);
    if (rows.length === 0) return [];

    const values = await this.plans.findValuesByPlanIds(
      rows.map((plan) => plan.id),
    );

    return rows.map((plan) => this.compose(plan, catalog, values));
  }

  async get(id: string): Promise<PlanResponseDto> {
    const plan = await this.requirePlan(id);
    const [catalog, values] = await Promise.all([
      this.plans.findFeatures(),
      this.plans.findValuesByPlanIds([plan.id]),
    ]);
    return this.compose(plan, catalog, values);
  }

  async create(
    dto: SavePlanDto,
    actor: BillingActor,
  ): Promise<PlanResponseDto> {
    await this.assertCodeFree(dto.code);
    this.assertCoherentType(dto);

    const plan = new Plan();
    this.assign(plan, dto);
    const saved = await this.plans.save(plan);

    await this.audit.record({
      action: 'plans.create',
      actorUserId: actor.userId,
      entity: 'plan',
      entityId: saved.id,
      ip: actor.ip,
      userAgent: actor.userAgent,
      metadata: { code: saved.code, planType: saved.planType },
    });

    return this.get(saved.id);
  }

  async update(
    id: string,
    dto: SavePlanDto,
    actor: BillingActor,
  ): Promise<PlanResponseDto> {
    const plan = await this.requirePlan(id);
    await this.assertCodeFree(dto.code, plan.id);
    this.assertCoherentType(dto);

    this.assign(plan, dto);
    const saved = await this.plans.save(plan);

    await this.audit.record({
      action: 'plans.update',
      actorUserId: actor.userId,
      entity: 'plan',
      entityId: saved.id,
      ip: actor.ip,
      userAgent: actor.userAgent,
      metadata: { code: saved.code },
    });

    return this.get(saved.id);
  }

  async changeStatus(
    id: string,
    isActive: boolean,
    actor: BillingActor,
  ): Promise<PlanResponseDto> {
    const plan = await this.requirePlan(id);
    plan.isActive = isActive;
    await this.plans.save(plan);

    await this.audit.record({
      action: 'plans.status',
      actorUserId: actor.userId,
      entity: 'plan',
      entityId: plan.id,
      ip: actor.ip,
      userAgent: actor.userAgent,
      metadata: { isActive },
    });

    return this.get(plan.id);
  }

  listFeatures(): Promise<PlanFeatureResponseDto[]> {
    return this.plans
      .findFeatures()
      .then((rows) => rows.map(toPlanFeatureResponse));
  }

  async createFeature(
    dto: SavePlanFeatureDto,
    actor: BillingActor,
  ): Promise<PlanFeatureResponseDto> {
    const existing = await this.plans.findFeatureByCode(dto.code);
    const feature = existing ?? new PlanFeature();
    feature.code = dto.code;
    feature.name = dto.name;
    feature.description = dto.description ?? null;
    feature.valueType = dto.valueType;
    feature.sortOrder = dto.sortOrder ?? 0;

    const saved = await this.plans.saveFeature(feature);
    await this.audit.record({
      action: 'plans.feature.save',
      actorUserId: actor.userId,
      entity: 'plan_feature',
      entityId: saved.code,
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    return toPlanFeatureResponse(saved);
  }

  /**
   * Reemplaza la matriz de beneficios de un plan. Se borra la anterior para
   * que quitar un beneficio sea posible: un `upsert` dejaría los viejos.
   */
  async setPlanFeatures(
    planId: string,
    features: PlanFeatureValueDto[],
    actor: BillingActor,
  ): Promise<PlanResponseDto> {
    const plan = await this.requirePlan(planId);

    const catalog = await this.plans.findFeatures();
    const known = new Set(catalog.map((feature) => feature.code));
    const unknown = features.filter((item) => !known.has(item.featureCode));
    if (unknown.length > 0) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.PLAN_FEATURE_NOT_FOUND,
        `Estos beneficios no existen en el catálogo: ${unknown
          .map((item) => item.featureCode)
          .join(', ')}.`,
      );
    }

    await this.plans.deleteValuesByPlanId(plan.id);
    for (const item of features) {
      const value = new PlanFeatureValue();
      value.planId = plan.id;
      value.featureCode = item.featureCode;
      value.isIncluded = item.isIncluded;
      value.value = item.value ?? null;
      await this.plans.saveValue(value);
    }

    await this.audit.record({
      action: 'plans.features.set',
      actorUserId: actor.userId,
      entity: 'plan',
      entityId: plan.id,
      ip: actor.ip,
      userAgent: actor.userAgent,
      metadata: { featureCount: features.length },
    });

    return this.get(plan.id);
  }

  private compose(
    plan: Plan,
    catalog: PlanFeature[],
    allValues: PlanFeatureValue[],
  ): PlanResponseDto {
    const price = this.pricing.breakdown(plan);
    const recurring = plan.planType === PlanType.ANNUAL_SUBSCRIPTION;
    return toPlanResponse(
      plan,
      price,
      this.pricing.availableMethods(price.total, recurring),
      catalog,
      allValues.filter((value) => value.planId === plan.id),
    );
  }

  private assign(plan: Plan, dto: SavePlanDto): void {
    plan.code = dto.code;
    plan.name = dto.name;
    plan.description = dto.description ?? null;
    plan.planType = dto.planType;
    plan.basePrice = dto.basePrice.toFixed(2);
    plan.currency = BILLING_CURRENCY;
    plan.taxRate = MX_TAX_RATE.toFixed(4);
    plan.validityDays = dto.validityDays ?? null;
    plan.billingPeriod = dto.billingPeriod;
    plan.postingQuota = dto.postingQuota ?? null;
    plan.isPopular = dto.isPopular ?? false;
    plan.isActive = dto.isActive ?? false;
    plan.sortOrder = dto.sortOrder ?? 0;
  }

  /**
   * Un plan por publicación necesita días de vigencia; uno de suscripción, no
   * — su vigencia la marca el periodo pagado.
   */
  private assertCoherentType(dto: SavePlanDto): void {
    if (dto.planType === PlanType.PER_PUBLICATION && !dto.validityDays) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.PLAN_INVALID_CONFIGURATION,
        'Un plan por publicación necesita días de vigencia.',
      );
    }
  }

  private async assertCodeFree(code: string, exceptId?: string): Promise<void> {
    if (await this.plans.existsByCode(code, exceptId)) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.PLAN_ALREADY_EXISTS,
        `Ya existe un plan con el código ${code}.`,
      );
    }
  }

  private async requirePlan(id: string): Promise<Plan> {
    const plan = await this.plans.findById(id);
    if (!plan) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.PLAN_NOT_FOUND,
        'El plan no existe.',
      );
    }
    return plan;
  }
}
