import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env';
import { ApiSuccessResponse } from '@/core/models/api-response.models';
import {
  Checkout,
  EligibleVacancy,
  Order,
  PaymentMethod,
  PaymentProvider,
  PaymentProviderOption,
  Plan,
  Promotion,
  PromotionSummary,
  PromotionsPage,
  Subscription,
} from '@/features/company/billing/models/billing.models';

/** Promociones de vacantes y suscripción de la empresa (M14). */
@Injectable({ providedIn: 'root' })
export class BillingApi {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiBaseUrl;
  private readonly base = `${environment.apiBaseUrl}/company`;

  /** Catálogo público: sólo los planes publicados por el administrador. */
  listPlans(): Observable<Plan[]> {
    return this.http
      .get<ApiSuccessResponse<Plan[]>>(`${this.api}/plans`)
      .pipe(map((r) => r.content));
  }

  /** Medios de pago del entorno: Stripe sólo aparece si está configurado. */
  paymentOptions(): Observable<PaymentProviderOption[]> {
    return this.http
      .get<
        ApiSuccessResponse<PaymentProviderOption[]>
      >(`${this.api}/payments/options`)
      .pipe(map((r) => r.content));
  }

  listPromotions(page = 1, limit = 10): Observable<PromotionsPage> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http
      .get<ApiSuccessResponse<PromotionsPage>>(`${this.base}/promotions`, {
        params,
      })
      .pipe(map((r) => r.content));
  }

  getVacancyPromotion(vacancyId: string): Observable<Promotion | null> {
    return this.http
      .get<
        ApiSuccessResponse<Promotion | null>
      >(`${this.base}/vacancies/${vacancyId}/promotion`)
      .pipe(map((r) => r.content));
  }

  createPromotion(
    vacancyId: string,
    planId: string | null,
    useSubscriptionCredit = false,
  ): Observable<Promotion> {
    return this.http
      .post<
        ApiSuccessResponse<Promotion>
      >(`${this.base}/vacancies/${vacancyId}/promotions`, {
        planId,
        useSubscriptionCredit,
      })
      .pipe(map((r) => r.content));
  }

  checkout(
    promotionId: string,
    method: PaymentMethod,
    provider: PaymentProvider,
  ): Observable<Checkout> {
    const body = { method, provider };

    return this.http
      .post<
        ApiSuccessResponse<Checkout>
      >(`${this.base}/promotions/${promotionId}/checkout`, body)
      .pipe(map((r) => r.content));
  }

  currentSubscription(): Observable<Subscription | null> {
    return this.http
      .get<
        ApiSuccessResponse<Subscription | null>
      >(`${this.base}/subscriptions/current`)
      .pipe(map((r) => r.content));
  }

  createSubscription(
    planId: string,
    method: PaymentMethod,
    provider: PaymentProvider,
    recurringConsent: boolean,
  ): Observable<Checkout> {
    return this.http
      .post<ApiSuccessResponse<Checkout>>(`${this.base}/subscriptions`, {
        planId,
        method,
        provider,
        recurringConsent,
      })
      .pipe(map((r) => r.content));
  }

  /** Retira un cobro abierto propio y libera lo que tenía reservado. */
  cancelPayment(orderId: string): Observable<Order> {
    return this.http
      .post<
        ApiSuccessResponse<Order>
      >(`${this.base}/payments/${orderId}/cancel`, {})
      .pipe(map((r) => r.content));
  }

  summary(): Observable<PromotionSummary> {
    return this.http
      .get<
        ApiSuccessResponse<PromotionSummary>
      >(`${this.base}/promotions/summary`)
      .pipe(map((r) => r.content));
  }

  eligibleVacancies(): Observable<EligibleVacancy[]> {
    return this.http
      .get<
        ApiSuccessResponse<EligibleVacancy[]>
      >(`${this.base}/promotions/eligible-vacancies`)
      .pipe(map((r) => r.content));
  }

  getPromotion(id: string): Observable<Promotion> {
    return this.http
      .get<ApiSuccessResponse<Promotion>>(`${this.base}/promotions/${id}`)
      .pipe(map((r) => r.content));
  }

  cancelRenewal(): Observable<Subscription> {
    return this.http
      .delete<
        ApiSuccessResponse<Subscription>
      >(`${this.base}/subscriptions/renewal`)
      .pipe(map((r) => r.content));
  }
}
