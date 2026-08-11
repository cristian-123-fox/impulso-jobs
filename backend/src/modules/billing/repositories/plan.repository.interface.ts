import { EntityManager } from 'typeorm';
import { PlanFeatureValue } from '@/modules/billing/entities/plan-feature-value.entity';
import { PlanFeature } from '@/modules/billing/entities/plan-feature.entity';
import { Plan } from '@/modules/billing/entities/plan.entity';

export const PLAN_REPOSITORY = 'PLAN_REPOSITORY';

export interface IPlanRepository {
  /** `onlyActive` para el catálogo público; el admin los ve todos. */
  findAll(onlyActive: boolean, manager?: EntityManager): Promise<Plan[]>;
  findById(id: string, manager?: EntityManager): Promise<Plan | null>;
  findByCode(code: string, manager?: EntityManager): Promise<Plan | null>;
  existsByCode(
    code: string,
    exceptId?: string,
    manager?: EntityManager,
  ): Promise<boolean>;
  save(plan: Plan, manager?: EntityManager): Promise<Plan>;

  /** Catálogo de beneficios, en orden de presentación. */
  findFeatures(manager?: EntityManager): Promise<PlanFeature[]>;
  findFeatureByCode(
    code: string,
    manager?: EntityManager,
  ): Promise<PlanFeature | null>;
  saveFeature(
    feature: PlanFeature,
    manager?: EntityManager,
  ): Promise<PlanFeature>;

  /** Valores de beneficio de varios planes (matriz del catálogo). */
  findValuesByPlanIds(
    planIds: string[],
    manager?: EntityManager,
  ): Promise<PlanFeatureValue[]>;
  saveValue(
    value: PlanFeatureValue,
    manager?: EntityManager,
  ): Promise<PlanFeatureValue>;
  /** Reemplaza la matriz de un plan: borra la anterior antes de escribir. */
  deleteValuesByPlanId(planId: string, manager?: EntityManager): Promise<void>;
}
