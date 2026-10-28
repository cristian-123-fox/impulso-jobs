import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, tap } from 'rxjs';
import { BillingApi } from '@/features/company/billing/data/billing.api';
import {
  Checkout,
  EligibleVacancy,
  Order,
  PaymentMethod,
  PaymentProvider,
  PaymentProviderOption,
  Plan,
  Promotion,
  PromotionListItem,
  PromotionSummary,
  Subscription,
} from '@/features/company/billing/models/billing.models';

type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

/**
 * La página de promociones muestra activas e historial en dos tablas, sin
 * paginador propio. Se traen hasta 100 filas: suficiente para el histórico
 * normal de una empresa y evita que una promoción antigua quede fuera por el
 * corte de 10.
 */
const PAGE_SIZE = 100;

/** Fachada de facturación de la empresa: planes, promociones y suscripción. */
@Injectable()
export class BillingFacade {
  private readonly api = inject(BillingApi);
  private readonly destroyRef = inject(DestroyRef);

  readonly plans = signal<Plan[]>([]);
  readonly paymentOptions = signal<PaymentProviderOption[]>([]);
  readonly promotions = signal<PromotionListItem[]>([]);
  readonly subscription = signal<Subscription | null>(null);
  /** Resumen de cupos calculado por el backend (fuente de la sección 1). */
  readonly summary = signal<PromotionSummary | null>(null);
  readonly summaryState = signal<LoadState>('idle');
  readonly eligibleVacancies = signal<EligibleVacancy[]>([]);
  readonly eligibleState = signal<LoadState>('idle');
  /** `true` en cuanto se sabe si hay suscripción (haya o no). */
  readonly subscriptionLoaded = signal(false);
  /** `true` en cuanto llegó el catálogo, aunque venga vacío. */
  readonly plansLoaded = signal(false);
  readonly state = signal<LoadState>('idle');
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pages = signal(1);

  readonly perPublicationPlans = computed(() =>
    this.plans().filter((plan) => plan.planType === 'PER_PUBLICATION'),
  );
  readonly subscriptionPlans = computed(() =>
    this.plans().filter((plan) => plan.planType === 'ANNUAL_SUBSCRIPTION'),
  );

  loadPlans(): void {
    if (this.plans().length > 0) return;
    this.api
      .listPlans()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (plans) => {
          this.plans.set(plans);
          this.plansLoaded.set(true);
        },
        error: () => this.plansLoaded.set(true),
      });
  }

  loadPaymentOptions(): void {
    this.api
      .paymentOptions()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (options) => this.paymentOptions.set(options),
        // Sin respuesta queda al menos la solicitud de pago, que no depende
        // de ningún servicio externo.
        error: () =>
          this.paymentOptions.set([
            {
              provider: PaymentProvider.MANUAL,
              methods: [PaymentMethod.SPEI],
              recurringMethods: [PaymentMethod.SPEI],
            },
          ]),
      });
  }

  loadPromotions(page = this.page()): void {
    this.state.set('loading');
    this.page.set(page);
    this.api
      .listPromotions(page, PAGE_SIZE)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.promotions.set(result.items);
          this.total.set(result.total);
          this.pages.set(result.pages);
          this.state.set('loaded');
        },
        error: () => this.state.set('error'),
      });
  }

  loadSubscription(): void {
    this.api
      .currentSubscription()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (subscription) => {
          this.subscription.set(subscription);
          this.subscriptionLoaded.set(true);
        },
        // Sin suscripción el backend responde `null`; un error no debe romper
        // la vista, que se sostiene sola con los planes.
        error: () => {
          this.subscription.set(null);
          this.subscriptionLoaded.set(true);
        },
      });
  }

  /** Resumen de plan y cupos: lo calcula el backend, no el componente. */
  loadSummary(): void {
    this.summaryState.set('loading');
    this.api
      .summary()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (summary) => {
          this.summary.set(summary);
          this.summaryState.set('loaded');
        },
        error: () => this.summaryState.set('error'),
      });
  }

  /** Vacantes activas sin promoción viva, para el modal de activación. */
  loadEligibleVacancies(): void {
    this.eligibleState.set('loading');
    this.api
      .eligibleVacancies()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (vacancies) => {
          this.eligibleVacancies.set(vacancies);
          this.eligibleState.set('loaded');
        },
        error: () => this.eligibleState.set('error'),
      });
  }

  createPromotion(
    vacancyId: string,
    planId: string | null,
    useSubscriptionCredit = false,
  ): Observable<Promotion> {
    return this.api
      .createPromotion(vacancyId, planId, useSubscriptionCredit)
      .pipe(
        tap(() => {
          this.loadPromotions(1);
          this.loadSummary();
          this.loadEligibleVacancies();
        }),
      );
  }

  checkout(
    promotionId: string,
    method: PaymentMethod,
    provider: PaymentProvider,
  ): Observable<Checkout> {
    return this.api
      .checkout(promotionId, method, provider)
      .pipe(tap(() => this.loadPromotions(this.page())));
  }

  createSubscription(
    planId: string,
    method: PaymentMethod,
    provider: PaymentProvider,
    recurringConsent = false,
  ): Observable<Checkout> {
    return this.api
      .createSubscription(planId, method, provider, recurringConsent)
      .pipe(tap(() => this.loadSubscription()));
  }

  cancelPayment(orderId: string): Observable<Order> {
    return this.api.cancelPayment(orderId).pipe(
      tap(() => {
        this.loadPromotions(this.page());
        this.loadSubscription();
      }),
    );
  }

  cancelRenewal(): Observable<Subscription> {
    return this.api
      .cancelRenewal()
      .pipe(tap((subscription) => this.subscription.set(subscription)));
  }
}
