import { EntityManager } from 'typeorm';
import { CompanySubscription } from '@/modules/billing/entities/company-subscription.entity';
import { ProcessedPaymentEvent } from '@/modules/billing/entities/processed-payment-event.entity';
import { PromotionOrder } from '@/modules/billing/entities/promotion-order.entity';
import { SubscriptionNotice } from '@/modules/billing/entities/subscription-notice.entity';
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
  /**
   * Suscripción vigente o pendiente de pago de la empresa. Descarta las que ya
   * pasaron su `currentPeriodEnd` aunque el job de expiración todavía no las
   * haya marcado: si no, la empresa queda sin poder renovar hasta el cron.
   */
  findLiveSubscriptionByCompany(
    companyId: string,
    now: Date,
    manager?: EntityManager,
  ): Promise<CompanySubscription | null>;
  /** Suscripciones en curso cuyo periodo ya venció (trabajo de expiración). */
  findExpiredActiveSubscriptions(
    now: Date,
    manager?: EntityManager,
  ): Promise<CompanySubscription[]>;
  /**
   * Suscripciones activas que vencen entre `now` y `limit`: las candidatas a
   * recibir un aviso previo.
   */
  findSubscriptionsExpiringBefore(
    now: Date,
    limit: Date,
    manager?: EntityManager,
  ): Promise<CompanySubscription[]>;
  saveSubscription(
    subscription: CompanySubscription,
    manager?: EntityManager,
  ): Promise<CompanySubscription>;

  // ---- Avisos de vencimiento (T22) ---------------------------------------
  /**
   * Registra el acuse del aviso y devuelve `true` si es la primera vez que se
   * envía ese umbral para ese periodo. `false` significa duplicado: el job ya
   * avisó y no debe reenviar. Mismo patrón que `registerEventOnce`.
   */
  registerSubscriptionNoticeOnce(
    notice: SubscriptionNotice,
    manager?: EntityManager,
  ): Promise<boolean>;

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
