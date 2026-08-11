import { EntityManager } from 'typeorm';
import { CompanySubscription } from '@/modules/billing/entities/company-subscription.entity';
import { ProcessedPaymentEvent } from '@/modules/billing/entities/processed-payment-event.entity';
import { PromotionOrder } from '@/modules/billing/entities/promotion-order.entity';
import { VacancyPromotion } from '@/modules/billing/entities/vacancy-promotion.entity';

export const BILLING_REPOSITORY = 'BILLING_REPOSITORY';

export interface CompanyPromotionSearch {
  companyId: string;
  page: number;
  limit: number;
}

export interface IBillingRepository {
  // ---- Promociones -------------------------------------------------------
  findPromotionById(
    id: string,
    manager?: EntityManager,
  ): Promise<VacancyPromotion | null>;
  findPromotionByIdAndCompany(
    id: string,
    companyId: string,
    manager?: EntityManager,
  ): Promise<VacancyPromotion | null>;
  /** Promoción vigente o pendiente de pago de una vacante, si la hay. */
  findLivePromotionByVacancy(
    vacancyId: string,
    manager?: EntityManager,
  ): Promise<VacancyPromotion | null>;
  findAndCountPromotionsByCompany(
    criteria: CompanyPromotionSearch,
    manager?: EntityManager,
  ): Promise<[VacancyPromotion[], number]>;
  /** Promociones activas ya vencidas (trabajo de expiración). */
  findExpiredActivePromotions(
    now: Date,
    manager?: EntityManager,
  ): Promise<VacancyPromotion[]>;
  savePromotion(
    promotion: VacancyPromotion,
    manager?: EntityManager,
  ): Promise<VacancyPromotion>;

  // ---- Suscripciones -----------------------------------------------------
  findSubscriptionById(
    id: string,
    manager?: EntityManager,
  ): Promise<CompanySubscription | null>;
  /** Suscripción vigente o pendiente de pago de la empresa. */
  findLiveSubscriptionByCompany(
    companyId: string,
    manager?: EntityManager,
  ): Promise<CompanySubscription | null>;
  saveSubscription(
    subscription: CompanySubscription,
    manager?: EntityManager,
  ): Promise<CompanySubscription>;

  // ---- Órdenes -----------------------------------------------------------
  findOrderById(
    id: string,
    manager?: EntityManager,
  ): Promise<PromotionOrder | null>;
  findOrderByExternalReference(
    reference: string,
    manager?: EntityManager,
  ): Promise<PromotionOrder | null>;
  findOrdersByPromotionId(
    promotionId: string,
    manager?: EntityManager,
  ): Promise<PromotionOrder[]>;
  /** Órdenes en espera de un cobro asíncrono (trabajo de reconciliación). */
  findAwaitingOrders(manager?: EntityManager): Promise<PromotionOrder[]>;
  saveOrder(
    order: PromotionOrder,
    manager?: EntityManager,
  ): Promise<PromotionOrder>;

  // ---- Idempotencia de eventos -------------------------------------------
  /**
   * Registra el evento y devuelve `true` si es la primera vez que se ve.
   * `false` significa duplicado: hay que descartarlo sin volver a procesarlo.
   */
  registerEventOnce(
    event: ProcessedPaymentEvent,
    manager?: EntityManager,
  ): Promise<boolean>;
}
