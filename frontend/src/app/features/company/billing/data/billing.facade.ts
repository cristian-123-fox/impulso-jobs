import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, tap } from 'rxjs';
import { BillingApi } from '@/features/company/billing/data/billing.api';
import {
  Checkout,
  PaymentMethod,
  Plan,
  Promotion,
  Subscription,
} from '@/features/company/billing/models/billing.models';

type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

const PAGE_SIZE = 10;

/** Fachada de facturación de la empresa: planes, promociones y suscripción. */
@Injectable()
export class BillingFacade {
  private readonly api = inject(BillingApi);
  private readonly destroyRef = inject(DestroyRef);

  readonly plans = signal<Plan[]>([]);
  readonly promotions = signal<Promotion[]>([]);
  readonly subscription = signal<Subscription | null>(null);
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
      .subscribe((plans) => this.plans.set(plans));
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
        next: (subscription) => this.subscription.set(subscription),
        // Sin suscripción el backend responde `null`; un error no debe romper
        // la vista, que se sostiene sola con los planes.
        error: () => this.subscription.set(null),
      });
  }

  createPromotion(vacancyId: string, planId: string): Observable<Promotion> {
    return this.api
      .createPromotion(vacancyId, planId)
      .pipe(tap(() => this.loadPromotions(1)));
  }

  checkout(
    promotionId: string,
    method: PaymentMethod,
    installments?: number,
  ): Observable<Checkout> {
    return this.api
      .checkout(promotionId, method, installments)
      .pipe(tap(() => this.loadPromotions(this.page())));
  }

  createSubscription(
    planId: string,
    method: PaymentMethod,
  ): Observable<Checkout> {
    return this.api
      .createSubscription(planId, method)
      .pipe(tap(() => this.loadSubscription()));
  }

  cancelRenewal(): Observable<Subscription> {
    return this.api
      .cancelRenewal()
      .pipe(tap((subscription) => this.subscription.set(subscription)));
  }
}
