import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '@/modules/audit/audit.module';
import { AdminCompanySubscriptionsController } from '@/modules/billing/controllers/admin-company-subscriptions.controller';
import { AdminPlansController } from '@/modules/billing/controllers/admin-plans.controller';
import { CompanyBillingController } from '@/modules/billing/controllers/company-billing.controller';
import { PaymentsController } from '@/modules/billing/controllers/payments.controller';
import { PublicPlansController } from '@/modules/billing/controllers/public-plans.controller';
import { CompanySubscription } from '@/modules/billing/entities/company-subscription.entity';
import { PlanFeatureValue } from '@/modules/billing/entities/plan-feature-value.entity';
import { PlanFeature } from '@/modules/billing/entities/plan-feature.entity';
import { Plan } from '@/modules/billing/entities/plan.entity';
import { ProcessedPaymentEvent } from '@/modules/billing/entities/processed-payment-event.entity';
import { PromotionOrder } from '@/modules/billing/entities/promotion-order.entity';
import { SubscriptionNotice } from '@/modules/billing/entities/subscription-notice.entity';
import { VacancyPromotion } from '@/modules/billing/entities/vacancy-promotion.entity';
import { BILLING_REPOSITORY } from '@/modules/billing/repositories/billing.repository.interface';
import { BillingRepository } from '@/modules/billing/repositories/billing.repository';
import { PLAN_REPOSITORY } from '@/modules/billing/repositories/plan.repository.interface';
import { PlanRepository } from '@/modules/billing/repositories/plan.repository';
import { CompanySubscriptionNotifier } from '@/modules/billing/services/company-subscription-notifier.service';
import { EntitlementService } from '@/modules/billing/services/entitlement.service';
import { ManualPaymentAdapter } from '@/modules/billing/services/manual-payment.adapter';
import { PAYMENT_PROVIDER } from '@/modules/billing/services/payment-provider.port';
import { PricingService } from '@/modules/billing/services/pricing.service';
import { AdminSubscriptionUseCase } from '@/modules/billing/use-cases/admin-subscription.use-case';
import { CompanySubscriptionUseCase } from '@/modules/billing/use-cases/company-subscription.use-case';
import { ExpirePromotionsUseCase } from '@/modules/billing/use-cases/expire-promotions.use-case';
import { ExpireSubscriptionsUseCase } from '@/modules/billing/use-cases/expire-subscriptions.use-case';
import { NotifySubscriptionExpiryUseCase } from '@/modules/billing/use-cases/notify-subscription-expiry.use-case';
import { PlanCatalogUseCase } from '@/modules/billing/use-cases/plan-catalog.use-case';
import { SettlePaymentUseCase } from '@/modules/billing/use-cases/settle-payment.use-case';
import { VacancyPromotionUseCase } from '@/modules/billing/use-cases/vacancy-promotion.use-case';
import { CompaniesModule } from '@/modules/companies/companies.module';
import { AuthModule } from '@/modules/iam/auth/auth.module';
import { UsersModule } from '@/modules/iam/users/users.module';
import { PermissionsModule } from '@/modules/iam/permissions/permissions.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { TalentModule } from '@/modules/talent/talent.module';
import { VacanciesModule } from '@/modules/vacancies/vacancies.module';

/**
 * M14: monetización.
 *
 * El cobro se hace **contra un puerto**, no contra Stripe: hoy lo implementa
 * `ManualPaymentAdapter` porque no hay cuenta ni entidad legal mexicana. Para
 * conectar Stripe basta escribir `StripePaymentAdapter` con el mismo contrato
 * y cambiar el `useClass` de abajo — la lógica de activación, la idempotencia
 * y los entitlements no se tocan.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Plan,
      PlanFeature,
      PlanFeatureValue,
      VacancyPromotion,
      CompanySubscription,
      PromotionOrder,
      ProcessedPaymentEvent,
      SubscriptionNotice,
    ]),
    AuditModule,
    AuthModule,
    PermissionsModule,
    UsersModule,
    VacanciesModule,
    TalentModule,
    CompaniesModule,
    NotificationsModule,
  ],
  controllers: [
    PublicPlansController,
    AdminPlansController,
    AdminCompanySubscriptionsController,
    CompanyBillingController,
    PaymentsController,
  ],
  providers: [
    { provide: PLAN_REPOSITORY, useClass: PlanRepository },
    { provide: BILLING_REPOSITORY, useClass: BillingRepository },
    // 👇 Único punto a cambiar cuando exista la cuenta de Stripe.
    { provide: PAYMENT_PROVIDER, useClass: ManualPaymentAdapter },
    PricingService,
    EntitlementService,
    CompanySubscriptionNotifier,
    PlanCatalogUseCase,
    VacancyPromotionUseCase,
    CompanySubscriptionUseCase,
    AdminSubscriptionUseCase,
    SettlePaymentUseCase,
    ExpirePromotionsUseCase,
    ExpireSubscriptionsUseCase,
    NotifySubscriptionExpiryUseCase,
  ],
  exports: [
    PLAN_REPOSITORY,
    BILLING_REPOSITORY,
    ExpirePromotionsUseCase,
    ExpireSubscriptionsUseCase,
    NotifySubscriptionExpiryUseCase,
  ],
})
export class BillingModule {}
