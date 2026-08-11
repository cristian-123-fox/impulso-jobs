import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, LessThanOrEqual, Repository } from 'typeorm';
import { CompanySubscription } from '@/modules/billing/entities/company-subscription.entity';
import { ProcessedPaymentEvent } from '@/modules/billing/entities/processed-payment-event.entity';
import { PromotionOrder } from '@/modules/billing/entities/promotion-order.entity';
import { VacancyPromotion } from '@/modules/billing/entities/vacancy-promotion.entity';
import {
  PaymentStatus,
  PromotionStatus,
  SubscriptionStatus,
} from '@/modules/billing/enums/billing.enums';
import {
  CompanyPromotionSearch,
  IBillingRepository,
} from '@/modules/billing/repositories/billing.repository.interface';

/** Estados que significan "esta promoción sigue ocupando la vacante". */
const LIVE_PROMOTION_STATUSES = [
  PromotionStatus.PENDING_PAYMENT,
  PromotionStatus.ACTIVE,
];

const LIVE_SUBSCRIPTION_STATUSES = [
  SubscriptionStatus.PENDING_PAYMENT,
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.PAST_DUE,
];

@Injectable()
export class BillingRepository implements IBillingRepository {
  private readonly logger = new Logger(BillingRepository.name);

  constructor(
    @InjectRepository(VacancyPromotion)
    private readonly promotions: Repository<VacancyPromotion>,
    @InjectRepository(CompanySubscription)
    private readonly subscriptions: Repository<CompanySubscription>,
    @InjectRepository(PromotionOrder)
    private readonly orders: Repository<PromotionOrder>,
    @InjectRepository(ProcessedPaymentEvent)
    private readonly events: Repository<ProcessedPaymentEvent>,
  ) {}

  private promoRepo(manager?: EntityManager): Repository<VacancyPromotion> {
    return manager ? manager.getRepository(VacancyPromotion) : this.promotions;
  }

  private subRepo(manager?: EntityManager): Repository<CompanySubscription> {
    return manager
      ? manager.getRepository(CompanySubscription)
      : this.subscriptions;
  }

  private orderRepo(manager?: EntityManager): Repository<PromotionOrder> {
    return manager ? manager.getRepository(PromotionOrder) : this.orders;
  }

  private eventRepo(
    manager?: EntityManager,
  ): Repository<ProcessedPaymentEvent> {
    return manager ? manager.getRepository(ProcessedPaymentEvent) : this.events;
  }

  findPromotionById(
    id: string,
    manager?: EntityManager,
  ): Promise<VacancyPromotion | null> {
    return this.promoRepo(manager).findOne({ where: { id } });
  }

  findPromotionByIdAndCompany(
    id: string,
    companyId: string,
    manager?: EntityManager,
  ): Promise<VacancyPromotion | null> {
    return this.promoRepo(manager).findOne({ where: { id, companyId } });
  }

  findLivePromotionByVacancy(
    vacancyId: string,
    manager?: EntityManager,
  ): Promise<VacancyPromotion | null> {
    return this.promoRepo(manager).findOne({
      where: { vacancyId, status: In(LIVE_PROMOTION_STATUSES) },
      order: { createdAt: 'DESC' },
    });
  }

  findAndCountPromotionsByCompany(
    criteria: CompanyPromotionSearch,
    manager?: EntityManager,
  ): Promise<[VacancyPromotion[], number]> {
    return this.promoRepo(manager).findAndCount({
      where: { companyId: criteria.companyId },
      order: { createdAt: 'DESC' },
      skip: (criteria.page - 1) * criteria.limit,
      take: criteria.limit,
    });
  }

  findExpiredActivePromotions(
    now: Date,
    manager?: EntityManager,
  ): Promise<VacancyPromotion[]> {
    return this.promoRepo(manager).find({
      where: { status: PromotionStatus.ACTIVE, endsAt: LessThanOrEqual(now) },
      order: { endsAt: 'ASC' },
    });
  }

  savePromotion(
    promotion: VacancyPromotion,
    manager?: EntityManager,
  ): Promise<VacancyPromotion> {
    return this.promoRepo(manager).save(promotion);
  }

  findSubscriptionById(
    id: string,
    manager?: EntityManager,
  ): Promise<CompanySubscription | null> {
    return this.subRepo(manager).findOne({ where: { id } });
  }

  findLiveSubscriptionByCompany(
    companyId: string,
    manager?: EntityManager,
  ): Promise<CompanySubscription | null> {
    return this.subRepo(manager).findOne({
      where: { companyId, status: In(LIVE_SUBSCRIPTION_STATUSES) },
      order: { createdAt: 'DESC' },
    });
  }

  saveSubscription(
    subscription: CompanySubscription,
    manager?: EntityManager,
  ): Promise<CompanySubscription> {
    return this.subRepo(manager).save(subscription);
  }

  findOrderById(
    id: string,
    manager?: EntityManager,
  ): Promise<PromotionOrder | null> {
    return this.orderRepo(manager).findOne({ where: { id } });
  }

  findOrderByExternalReference(
    reference: string,
    manager?: EntityManager,
  ): Promise<PromotionOrder | null> {
    return this.orderRepo(manager).findOne({
      where: { externalReference: reference },
    });
  }

  findOrdersByPromotionId(
    promotionId: string,
    manager?: EntityManager,
  ): Promise<PromotionOrder[]> {
    return this.orderRepo(manager).find({
      where: { promotionId },
      order: { createdAt: 'DESC' },
    });
  }

  findAwaitingOrders(manager?: EntityManager): Promise<PromotionOrder[]> {
    return this.orderRepo(manager).find({
      where: { paymentStatus: PaymentStatus.AWAITING_PAYMENT },
      order: { createdAt: 'ASC' },
    });
  }

  saveOrder(
    order: PromotionOrder,
    manager?: EntityManager,
  ): Promise<PromotionOrder> {
    return this.orderRepo(manager).save(order);
  }

  /**
   * La unicidad la garantiza la clave primaria compuesta, no una lectura
   * previa: dos webhooks simultáneos con el mismo evento pasarían los dos por
   * un `findOne`, pero sólo uno logra insertar.
   *
   * ⚠️ Llamar **fuera** de la transacción principal: en PostgreSQL un error de
   * clave duplicada aborta la transacción en curso, así que capturarlo dentro
   * dejaría inservible el resto del trabajo.
   */
  async registerEventOnce(
    event: ProcessedPaymentEvent,
    manager?: EntityManager,
  ): Promise<boolean> {
    try {
      await this.eventRepo(manager).insert(event);
      return true;
    } catch (error) {
      this.logger.debug(
        `Evento duplicado ${event.provider}/${event.eventId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return false;
    }
  }
}
