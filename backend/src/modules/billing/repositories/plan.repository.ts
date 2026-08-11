import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Not, Repository } from 'typeorm';
import { PlanFeatureValue } from '@/modules/billing/entities/plan-feature-value.entity';
import { PlanFeature } from '@/modules/billing/entities/plan-feature.entity';
import { Plan } from '@/modules/billing/entities/plan.entity';
import { IPlanRepository } from '@/modules/billing/repositories/plan.repository.interface';

/**
 * Acceso a planes, catálogo de beneficios y matriz de valores. Van juntos
 * porque siempre se leen juntos: un plan sin sus beneficios no sirve de nada.
 */
@Injectable()
export class PlanRepository implements IPlanRepository {
  constructor(
    @InjectRepository(Plan) private readonly plans: Repository<Plan>,
    @InjectRepository(PlanFeature)
    private readonly features: Repository<PlanFeature>,
    @InjectRepository(PlanFeatureValue)
    private readonly values: Repository<PlanFeatureValue>,
  ) {}

  private planRepo(manager?: EntityManager): Repository<Plan> {
    return manager ? manager.getRepository(Plan) : this.plans;
  }

  private featureRepo(manager?: EntityManager): Repository<PlanFeature> {
    return manager ? manager.getRepository(PlanFeature) : this.features;
  }

  private valueRepo(manager?: EntityManager): Repository<PlanFeatureValue> {
    return manager ? manager.getRepository(PlanFeatureValue) : this.values;
  }

  findAll(onlyActive: boolean, manager?: EntityManager): Promise<Plan[]> {
    return this.planRepo(manager).find({
      where: onlyActive ? { isActive: true } : {},
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  findById(id: string, manager?: EntityManager): Promise<Plan | null> {
    return this.planRepo(manager).findOne({ where: { id } });
  }

  findByCode(code: string, manager?: EntityManager): Promise<Plan | null> {
    return this.planRepo(manager).findOne({ where: { code } });
  }

  async existsByCode(
    code: string,
    exceptId?: string,
    manager?: EntityManager,
  ): Promise<boolean> {
    const count = await this.planRepo(manager).count({
      where: exceptId ? { code, id: Not(exceptId) } : { code },
    });
    return count > 0;
  }

  save(plan: Plan, manager?: EntityManager): Promise<Plan> {
    return this.planRepo(manager).save(plan);
  }

  findFeatures(manager?: EntityManager): Promise<PlanFeature[]> {
    return this.featureRepo(manager).find({ order: { sortOrder: 'ASC' } });
  }

  findFeatureByCode(
    code: string,
    manager?: EntityManager,
  ): Promise<PlanFeature | null> {
    return this.featureRepo(manager).findOne({ where: { code } });
  }

  saveFeature(
    feature: PlanFeature,
    manager?: EntityManager,
  ): Promise<PlanFeature> {
    return this.featureRepo(manager).save(feature);
  }

  findValuesByPlanIds(
    planIds: string[],
    manager?: EntityManager,
  ): Promise<PlanFeatureValue[]> {
    if (planIds.length === 0) return Promise.resolve([]);
    return this.valueRepo(manager).find({ where: { planId: In(planIds) } });
  }

  saveValue(
    value: PlanFeatureValue,
    manager?: EntityManager,
  ): Promise<PlanFeatureValue> {
    return this.valueRepo(manager).save(value);
  }

  async deleteValuesByPlanId(
    planId: string,
    manager?: EntityManager,
  ): Promise<void> {
    await this.valueRepo(manager).delete({ planId });
  }
}
