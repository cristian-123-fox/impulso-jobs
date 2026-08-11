import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { ApiErrorResponse } from '@/core/models/api-response.models';
import { IjButton, IjIcon, IjModal, IjOption } from '@/shared/ui';
import { AdminPagination } from '@/features/admin/shared/admin-pagination/admin-pagination';
import { BillingFacade } from '@/features/company/billing/data/billing.facade';
import {
  PromotionForm,
  PromotionRequest,
} from '@/features/company/billing/components/promotion-form/promotion-form';
import {
  Checkout,
  PAYMENT_STATUS_LABELS,
  PROMOTION_STATUS_LABELS,
  Promotion,
  SUBSCRIPTION_STATUS_LABELS,
} from '@/features/company/billing/models/billing.models';
import { VacanciesApi } from '@/features/company/vacancies/data/vacancies.api';
import { VacancyStatus } from '@/features/company/vacancies/models/vacancies.models';

/** Promociones de vacantes y suscripción anual de la empresa. */
@Component({
  selector: 'app-promotions-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyPipe,
    DatePipe,
    AdminPagination,
    PromotionForm,
    IjButton,
    IjIcon,
    IjModal,
  ],
  template: `
    <div class="mx-auto max-w-[1180px]">
      <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="text-2xl font-extrabold tracking-tight text-ink-900">
            Promociona tus vacantes
          </h1>
          <p class="mt-1.5 text-[13.5px] text-muted">
            Destaca una vacante o contrata la suscripción anual de la empresa.
          </p>
        </div>
        <button
          ij-button
          type="button"
          variant="primary"
          shape="rounded"
          size="md"
          (click)="openForm()"
        >
          <ij-icon name="award" [size]="16" />
          Promocionar vacante
        </button>
      </div>

      @if (actionError(); as message) {
        <p
          role="alert"
          class="mb-4 rounded-xl bg-red-50 px-4 py-3 text-[13.5px] font-medium text-red-700"
        >
          {{ message }}
        </p>
      }

      @if (facade.subscription(); as subscription) {
        <section class="mb-6 rounded-2xl bg-white p-5 shadow-card sm:p-6">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 class="text-base font-bold text-ink-900">
                Suscripción {{ subscription.planName || '' }}
              </h2>
              <p class="mt-1 text-[13.5px] text-muted">
                {{ statusOf(subscription.status) }}
                @if (subscription.currentPeriodEnd) {
                  · vigente hasta
                  {{ subscription.currentPeriodEnd | date: 'dd MMM yyyy' }}
                }
              </p>
              <p class="mt-1 text-[12.5px] text-muted">
                Renovación automática: {{ subscription.autoRenew ? 'activada' : 'cancelada' }}
              </p>
            </div>
            @if (subscription.autoRenew) {
              <button
                type="button"
                class="rounded-xl border border-line bg-white px-4 py-2.5 text-[13px] font-bold text-body transition-colors hover:bg-red-50 hover:text-red-600"
                (click)="onCancelRenewal()"
              >
                Cancelar renovación
              </button>
            }
          </div>
        </section>
      }

      <section class="mb-8">
        <h2 class="mb-3 text-lg font-bold text-ink-900">Planes disponibles</h2>
        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          @for (plan of facade.plans(); track plan.id) {
            <article
              class="flex flex-col rounded-2xl bg-white p-5 shadow-card"
              [class.ring-2]="plan.isPopular"
              [class.ring-brand]="plan.isPopular"
            >
              <div class="flex items-baseline justify-between gap-2">
                <h3 class="text-[15px] font-bold text-ink-900">{{ plan.name }}</h3>
                @if (plan.isPopular) {
                  <span
                    class="rounded-md bg-accent-amber-soft px-2 py-0.5 text-[11px] font-bold text-[#b26a15]"
                  >
                    Más popular
                  </span>
                }
              </div>
              @if (plan.description) {
                <p class="mt-1 text-[12.5px] text-muted">{{ plan.description }}</p>
              }
              <div class="mt-3 text-[24px] font-extrabold leading-none text-brand">
                {{ plan.price.total | currency: plan.price.currency : 'symbol-narrow' : '1.2-2' }}
              </div>
              <div class="mt-1 text-[12px] text-muted">
                IVA incluido ·
                {{ plan.planType === 'PER_PUBLICATION' ? 'pago único' : 'anual' }}
              </div>

              <ul class="mt-4 flex flex-col gap-1.5">
                @for (feature of includedFeatures(plan.features); track feature.code) {
                  <li class="flex items-start gap-2 text-[12.5px] text-body">
                    <span class="mt-0.5 flex-shrink-0 text-accent-green">
                      <ij-icon name="check" [size]="14" [strokeWidth]="2.6" />
                    </span>
                    <span>
                      {{ feature.name }}@if (feature.value) {
                        <span class="text-muted"> · {{ valueOf(feature.value) }}</span>
                      }
                    </span>
                  </li>
                }
              </ul>
            </article>
          } @empty {
            <p
              class="rounded-2xl bg-white p-10 text-center text-[13.5px] text-muted shadow-card md:col-span-2 xl:col-span-3"
            >
              El administrador aún no ha publicado planes.
            </p>
          }
        </div>
      </section>

      <section>
        <h2 class="mb-3 text-lg font-bold text-ink-900">Mis promociones</h2>
        @switch (facade.state()) {
          @case ('loading') {
            <div class="rounded-2xl bg-white p-10 text-center text-muted shadow-card">
              Cargando promociones…
            </div>
          }
          @case ('error') {
            <div class="rounded-2xl bg-white p-10 text-center text-red-600 shadow-card">
              No se pudieron cargar las promociones.
            </div>
          }
          @default {
            <div class="overflow-x-auto rounded-2xl bg-white shadow-card">
              <table class="w-full min-w-[820px] border-collapse text-left">
                <thead>
                  <tr class="border-b border-line">
                    @for (h of headers; track h) {
                      <th
                        class="px-5 py-3.5 text-[11.5px] font-bold uppercase tracking-wide text-muted"
                      >
                        {{ h }}
                      </th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (promo of facade.promotions(); track promo.id) {
                    <tr class="border-b border-line/70 transition-colors hover:bg-surface">
                      <td class="px-5 py-3.5 text-sm font-semibold text-ink-900">
                        {{ promo.planName || '—' }}
                      </td>
                      <td class="px-5 py-3.5">
                        <span
                          class="inline-block rounded-md px-2 py-1 text-[11.5px] font-bold"
                          [class]="statusBadge(promo.status)"
                        >
                          {{ statusOf(promo.status) }}
                        </span>
                      </td>
                      <td class="px-5 py-3.5 text-[13.5px] text-body">
                        {{ promo.pricePaid | currency: promo.currency : 'symbol-narrow' : '1.2-2' }}
                      </td>
                      <td class="px-5 py-3.5 text-[13px] text-muted">
                        {{ promo.order?.paymentMethod || '—' }}
                        @if (promo.order?.paymentStatus; as status) {
                          <div class="text-[12px]">{{ paymentOf(status) }}</div>
                        }
                      </td>
                      <td class="px-5 py-3.5 text-[13px] text-muted">
                        @if (promo.endsAt) {
                          {{ promo.endsAt | date: 'dd MMM yyyy' }}
                        } @else {
                          —
                        }
                      </td>
                      <td class="px-5 py-3.5">
                        @if (promo.order?.voucherUrl; as url) {
                          <a
                            [href]="url"
                            target="_blank"
                            rel="noopener"
                            class="text-[12.5px] font-bold text-brand hover:underline"
                          >
                            Ver ficha de pago
                          </a>
                        }
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="6" class="px-5 py-10 text-center text-[13.5px] text-muted">
                        Aún no has promocionado ninguna vacante.
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <app-admin-pagination
              [page]="facade.page()"
              [pages]="facade.pages()"
              [total]="facade.total()"
              (pageChange)="facade.loadPromotions($event)"
            />
          }
        }
      </section>
    </div>

    @if (showForm()) {
      <ij-modal
        title="Promocionar una vacante"
        subtitle="Elige la vacante, el plan y cómo pagarlo."
        size="lg"
        (close)="closeForm()"
      >
        <app-promotion-form
          [vacancies]="vacancyOptions()"
          [plans]="facade.perPublicationPlans()"
          [submitting]="saving()"
          [error]="formError()"
          (save)="onPromote($event)"
          (cancel)="closeForm()"
        />
      </ij-modal>
    }

    @if (checkout(); as result) {
      <ij-modal
        title="Cobro iniciado"
        subtitle="Sigue las instrucciones para completar el pago."
        size="sm"
        (close)="checkout.set(null)"
      >
        <dl class="flex flex-col gap-2.5">
          <div class="flex justify-between gap-3">
            <dt class="text-[13px] text-muted">Total</dt>
            <dd class="text-[13.5px] font-bold text-ink-900">
              {{ result.order.total | currency: result.order.currency : 'symbol-narrow' : '1.2-2' }}
            </dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-[13px] text-muted">Método</dt>
            <dd class="text-[13.5px] text-body">{{ result.order.paymentMethod }}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-[13px] text-muted">Estado</dt>
            <dd class="text-[13.5px] text-body">
              {{ paymentOf(result.order.paymentStatus) }}
            </dd>
          </div>
          @if (result.order.voucherReference; as reference) {
            <div class="flex justify-between gap-3">
              <dt class="text-[13px] text-muted">Referencia</dt>
              <dd class="text-[13.5px] font-mono text-body">{{ reference }}</dd>
            </div>
          }
        </dl>

        <p class="mt-4 rounded-xl bg-surface px-4 py-3 text-[12.5px] text-muted">
          La promoción se activará automáticamente cuando el pago se confirme.
        </p>

        <div class="mt-6 flex justify-end gap-3 border-t border-line pt-4">
          @if (result.checkoutUrl; as url) {
            <a
              [href]="url"
              target="_blank"
              rel="noopener"
              class="rounded-xl border border-line bg-white px-4 py-2.5 text-[13.5px] font-bold text-brand transition-colors hover:bg-surface"
            >
              Abrir pasarela
            </a>
          }
          <button
            ij-button
            type="button"
            variant="primary"
            shape="rounded"
            size="md"
            (click)="checkout.set(null)"
          >
            Entendido
          </button>
        </div>
      </ij-modal>
    }
  `,
})
export class PromotionsPage {
  protected readonly facade = inject(BillingFacade);
  private readonly vacanciesApi = inject(VacanciesApi);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly showForm = signal(false);
  protected readonly checkout = signal<Checkout | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);

  protected readonly headers = [
    'Plan',
    'Estado',
    'Importe',
    'Pago',
    'Vence',
    '',
  ];

  private readonly vacancies = signal<readonly IjOption[]>([]);
  protected readonly vacancyOptions = computed(() => this.vacancies());

  constructor() {
    this.facade.loadPlans();
    this.facade.loadPromotions(1);
    this.facade.loadSubscription();

    // Sólo se promocionan vacantes activas.
    this.vacanciesApi
      .list({ page: 1, limit: 100, status: VacancyStatus.ACTIVE })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) =>
        this.vacancies.set(
          result.items.map((vacancy) => ({
            value: vacancy.id,
            label: vacancy.title,
          })),
        ),
      );
  }

  protected includedFeatures(
    features: { code: string; name: string; isIncluded: boolean; value: string | null }[],
  ): { code: string; name: string; value: string | null }[] {
    return features.filter((feature) => feature.isIncluded);
  }

  /** `-1` es el convenio del backend para "sin tope". */
  protected valueOf(value: string): string {
    return value === '-1' ? 'ilimitado' : value;
  }

  protected statusOf(status: string): string {
    return (
      PROMOTION_STATUS_LABELS[status] ??
      SUBSCRIPTION_STATUS_LABELS[status] ??
      status
    );
  }

  protected paymentOf(status: string): string {
    return PAYMENT_STATUS_LABELS[status] ?? status;
  }

  protected statusBadge(status: string): string {
    switch (status) {
      case 'ACTIVE':
        return 'bg-accent-green-soft text-accent-green';
      case 'PENDING_PAYMENT':
        return 'bg-accent-amber-soft text-[#b26a15]';
      default:
        return 'bg-surface text-muted';
    }
  }

  protected openForm(): void {
    this.formError.set(null);
    this.showForm.set(true);
  }

  protected closeForm(): void {
    this.showForm.set(false);
    this.formError.set(null);
  }

  /**
   * Contratar son dos pasos en el backend: crear la promoción (queda pendiente
   * de pago) y abrir el cobro. Se encadenan para que el usuario lo viva como
   * uno solo.
   */
  protected onPromote(request: PromotionRequest): void {
    this.saving.set(true);
    this.formError.set(null);
    this.facade
      .createPromotion(request.vacancyId, request.planId)
      .pipe(
        switchMap((promotion: Promotion) =>
          this.facade.checkout(
            promotion.id,
            request.method,
            request.installments,
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (result) => {
          this.saving.set(false);
          this.closeForm();
          this.checkout.set(result);
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.formError.set(
            this.messageOf(error, 'No se pudo contratar la promoción.'),
          );
        },
      });
  }

  protected onCancelRenewal(): void {
    if (
      !confirm(
        '¿Cancelar la renovación automática? Conservarás el periodo que ya pagaste.',
      )
    ) {
      return;
    }
    this.actionError.set(null);
    this.facade
      .cancelRenewal()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: (error: unknown) =>
          this.actionError.set(
            this.messageOf(error, 'No se pudo cancelar la renovación.'),
          ),
      });
  }

  private messageOf(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as ApiErrorResponse | null;
      return body?.errors?.[0]?.message ?? body?.message ?? fallback;
    }
    return fallback;
  }
}
