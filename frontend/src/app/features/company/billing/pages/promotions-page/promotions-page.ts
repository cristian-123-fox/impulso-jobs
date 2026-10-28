import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { ApiErrorResponse } from '@/core/models/api-response.models';
import {
  IjButton,
  IjIcon,
  IjModal,
  IjOption,
  IjSelect,
  IjSpinner,
} from '@/shared/ui';
import { BillingFacade } from '@/features/company/billing/data/billing.facade';
import {
  PromotionForm,
  PromotionRequest,
} from '@/features/company/billing/components/promotion-form/promotion-form';
import {
  SubscriptionForm,
  SubscriptionRequest,
} from '@/features/company/billing/components/subscription-form/subscription-form';
import {
  Checkout,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  PROMOTION_STATUS_LABELS,
  Promotion,
  PromotionListItem,
  SUBSCRIPTION_STATUS_LABELS,
  isManualOrder,
  orderFolio,
} from '@/features/company/billing/models/billing.models';
import { VacanciesApi } from '@/features/company/vacancies/data/vacancies.api';
import { VacancyStatus } from '@/features/company/vacancies/models/vacancies.models';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Promociones de vacantes: usar los cupos del plan, no volver a vender el plan.
 *
 * La pantalla tiene cinco bloques y ni uno más:
 *   1. Plan y cupos (una sola tarjeta, sin precios ni matrices de beneficios).
 *   2. Activar una promoción con los cupos disponibles.
 *   3. Promociones activas.
 *   4. Historial.
 *   5. Cómo funciona.
 *
 * La compra/renovación del plan vive en su modal (`?plan=` desde /planes), no
 * como una sección de esta página. La tabla de promociones nunca muestra
 * órdenes, precios, métodos de pago ni folios: eso es el módulo de pagos.
 */
@Component({
  selector: 'app-promotions-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyPipe,
    DatePipe,
    FormsModule,
    RouterLink,
    PromotionForm,
    SubscriptionForm,
    IjButton,
    IjIcon,
    IjModal,
    IjSelect,
    IjSpinner,
  ],
  template: `
    <div class="mx-auto max-w-[1240px]">
      <div class="mb-6">
        <h1 class="text-[28px] font-extrabold leading-tight tracking-tight text-ink-900">
          Promociona tus vacantes
        </h1>
        <p class="mt-1.5 text-[14px] font-medium text-muted">
          Gestiona la visibilidad de tus ofertas laborales.
        </p>
      </div>

      @if (actionError(); as message) {
        <p
          role="alert"
          class="mb-4 rounded-xl bg-red-50 px-4 py-3 text-[13.5px] font-medium text-red-700"
        >
          {{ message }}
        </p>
      }

      @if (notice(); as message) {
        <p
          role="status"
          class="mb-4 flex items-start gap-2 rounded-xl bg-accent-green-soft px-4 py-3 text-[13.5px] font-medium text-accent-green-strong"
        >
          <ij-icon name="check" [size]="16" class="mt-0.5 flex-shrink-0" />
          <span>{{ message }}</span>
        </p>
      }

      <!-- 1. Mi plan y promociones disponibles -->
      <section class="mb-6 rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6">
        @switch (facade.summaryState()) {
          @case ('loading') {
            <div class="flex items-center gap-3 py-4 text-[13.5px] text-muted">
              <ij-spinner size="sm" />
              Cargando tu plan…
            </div>
          }
          @case ('error') {
            <div class="flex flex-wrap items-center justify-between gap-3 py-2">
              <p class="text-[13.5px] font-medium text-red-600">
                No pudimos cargar tu plan y tus cupos.
              </p>
              <button
                type="button"
                class="rounded-xl border border-line bg-white px-4 py-2 text-[13px] font-bold text-body hover:bg-surface"
                (click)="facade.loadSummary()"
              >
                Reintentar
              </button>
            </div>
          }
          @default {
            @if (planSummary(); as summary) {
              @if (summary.subscription; as subscription) {
                <div class="flex flex-wrap items-center gap-2.5">
                  <h2 class="text-[18px] font-extrabold text-ink-900">
                    Mi plan {{ subscription.planName || '' }}
                  </h2>
                  <span
                    class="rounded-md px-2 py-0.5 text-[11.5px] font-bold"
                    [class]="planStatusClass(subscription.status)"
                  >
                    {{ planStatusLabel(subscription.status) }}
                  </span>
                </div>

                <div class="mt-5 grid grid-cols-3 gap-3">
                  <div class="rounded-xl bg-surface px-3 py-3 text-center">
                    <p class="text-[22px] font-extrabold leading-none text-ink-900">
                      {{ summary.promotionsIncluded }}
                    </p>
                    <p class="mt-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                      Incluidas
                    </p>
                  </div>
                  <div class="rounded-xl bg-surface px-3 py-3 text-center">
                    <p class="text-[22px] font-extrabold leading-none text-ink-900">
                      {{ summary.promotionsUsed }}
                    </p>
                    <p class="mt-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                      Utilizadas
                    </p>
                  </div>
                  <div class="rounded-xl bg-brand-50 px-3 py-3 text-center">
                    <p class="text-[22px] font-extrabold leading-none text-brand-strong">
                      {{ summary.promotionsAvailable }}
                    </p>
                    <p class="mt-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-strong">
                      Disponible{{ summary.promotionsAvailable === 1 ? '' : 's' }}
                    </p>
                  </div>
                </div>

                <div class="mt-4 grid gap-3 sm:grid-cols-2">
                  <div class="rounded-xl bg-surface px-4 py-3">
                    <p class="text-[10.5px] font-bold uppercase tracking-wide text-muted">
                      Duración de promoción
                    </p>
                    <p class="mt-1 text-[14px] font-bold text-ink-900">
                      {{ summary.promotionDurationDays ? summary.promotionDurationDays + ' días' : '—' }}
                    </p>
                  </div>
                  <div class="rounded-xl bg-surface px-4 py-3">
                    <p class="text-[10.5px] font-bold uppercase tracking-wide text-muted">
                      Vigencia
                    </p>
                    <p class="mt-1 text-[14px] font-bold text-ink-900">
                      {{ subscription.currentPeriodEnd ? (subscription.currentPeriodEnd | date: 'dd/MM/yyyy') : 'Según suscripción' }}
                    </p>
                  </div>
                </div>
              } @else {
                <div class="flex flex-wrap items-center gap-2.5">
                  <h2 class="text-[18px] font-extrabold text-ink-900">Mi plan</h2>
                  <span class="rounded-md bg-surface px-2 py-0.5 text-[11.5px] font-bold text-muted">
                    Sin plan activo
                  </span>
                </div>

                <div class="mt-5 grid grid-cols-3 gap-3">
                  <div class="rounded-xl bg-surface px-3 py-3 text-center">
                    <p class="text-[22px] font-extrabold leading-none text-ink-900">0</p>
                    <p class="mt-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                      Incluidas
                    </p>
                  </div>
                  <div class="rounded-xl bg-surface px-3 py-3 text-center">
                    <p class="text-[22px] font-extrabold leading-none text-ink-900">0</p>
                    <p class="mt-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                      Utilizadas
                    </p>
                  </div>
                  <div class="rounded-xl bg-surface px-3 py-3 text-center">
                    <p class="text-[22px] font-extrabold leading-none text-ink-900">0</p>
                    <p class="mt-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                      Disponibles
                    </p>
                  </div>
                </div>

                <div class="mt-4 grid gap-3 sm:grid-cols-2">
                  <div class="rounded-xl bg-surface px-4 py-3">
                    <p class="text-[10.5px] font-bold uppercase tracking-wide text-muted">
                      Duración de promoción
                    </p>
                    <p class="mt-1 text-[14px] font-bold text-ink-900">—</p>
                  </div>
                  <div class="rounded-xl bg-surface px-4 py-3">
                    <p class="text-[10.5px] font-bold uppercase tracking-wide text-muted">
                      Vigencia
                    </p>
                    <p class="mt-1 text-[14px] font-bold text-ink-900">—</p>
                  </div>
                </div>

                <div class="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface px-4 py-3">
                  <p class="text-[12.5px] text-muted">
                    Contrata un plan con promociones incluidas para activarlas desde aquí.
                  </p>
                  <a
                    routerLink="/planes"
                    class="rounded-xl bg-brand px-4 py-2.5 text-[13px] font-bold text-white hover:bg-brand-600"
                  >
                    Ver planes
                  </a>
                </div>
              }
            }
          }
        }
      </section>

      <!-- 2. Promocionar una vacante -->
      <section class="mb-6 rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 class="text-[16px] font-extrabold text-ink-900">Promocionar una vacante</h2>
            <p class="mt-1 max-w-[620px] text-[13px] leading-relaxed text-muted">
              Destaca una vacante publicada utilizando los beneficios de tu plan.
            </p>
          </div>
          <button
            ij-button
            type="button"
            variant="primary"
            shape="rounded"
            size="md"
            [disabled]="!canPromote()"
            (click)="openActivate()"
          >
            <ij-icon name="award" [size]="16" />
            Promocionar vacante
          </button>
        </div>

        @if (!canPromote()) {
          <p class="mt-3 rounded-xl bg-surface px-4 py-3 text-[12.5px] text-muted">
            @if (!hasActivePlan()) {
              Necesitas un plan activo para promocionar vacantes.
            } @else {
              Ya usaste todas las promociones de tu plan.
            }
            <a routerLink="/planes" class="font-bold text-brand-strong hover:underline">
              Gestionar mi plan
            </a>
          </p>
        }
      </section>

      <!-- 3. Mis promociones activas -->
      <section class="mb-6 overflow-hidden rounded-2xl border border-line bg-white shadow-card">
        <div class="flex items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
          <h2 class="text-[16px] font-extrabold text-ink-900">Mis promociones activas</h2>
          <span class="text-[12px] font-semibold text-muted">
            {{ activePromotions().length }} activa{{ activePromotions().length === 1 ? '' : 's' }}
          </span>
        </div>

        @switch (facade.state()) {
          @case ('loading') {
            <div class="flex items-center justify-center gap-3 px-5 py-10 text-[13.5px] text-muted">
              <ij-spinner size="sm" />
              Cargando promociones…
            </div>
          }
          @case ('error') {
            <div class="px-5 py-10 text-center text-[13.5px] font-medium text-red-600">
              No pudimos cargar tus promociones.
              <button
                type="button"
                class="ml-2 font-bold text-brand-strong hover:underline"
                (click)="facade.loadPromotions(1)"
              >
                Reintentar
              </button>
            </div>
          }
          @default {
            @if (activePromotions().length === 0) {
              <div class="px-5 py-12 text-center">
                <span class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-strong">
                  <ij-icon name="award" [size]="24" />
                </span>
                <p class="mt-3 text-[14px] font-semibold text-ink-900">
                  Todavía no tienes vacantes promocionadas.
                </p>
              </div>
            } @else {
              <div class="overflow-x-auto">
                <table class="w-full min-w-[760px] border-collapse text-left">
                  <thead>
                    <tr class="border-b border-line bg-surface/60">
                      @for (header of activeHeaders; track header) {
                        <th class="px-5 py-3.5 text-[11.5px] font-bold uppercase tracking-wide text-muted">
                          {{ header }}
                        </th>
                      }
                    </tr>
                  </thead>
                  <tbody>
                    @for (promotion of activePromotions(); track promotion.id) {
                      <tr class="border-b border-line/70 last:border-0 hover:bg-surface">
                        <td class="px-5 py-3.5 text-sm font-semibold text-ink-900">
                          {{ promotion.vacancyTitle || 'Vacante' }}
                        </td>
                        <td class="px-5 py-3.5 text-[13px] text-muted">
                          {{ promotion.startsAt ? (promotion.startsAt | date: 'dd/MM/yyyy') : '—' }}
                        </td>
                        <td class="px-5 py-3.5 text-[13px] text-muted">
                          {{ promotion.endsAt ? (promotion.endsAt | date: 'dd/MM/yyyy') : '—' }}
                        </td>
                        <td class="px-5 py-3.5 text-[13px] font-semibold text-body">
                          {{ daysRemaining(promotion) }} días
                        </td>
                        <td class="px-5 py-3.5">
                          <span class="rounded-md bg-accent-green-soft px-2 py-1 text-[11.5px] font-bold text-accent-green">
                            {{ statusOf(promotion.status) }}
                          </span>
                        </td>
                        <td class="px-5 py-3.5">
                          <a
                            [routerLink]="['/vacantes', promotion.vacancyId]"
                            class="text-[12.5px] font-bold text-brand-strong hover:underline"
                          >
                            Ver detalles
                          </a>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          }
        }
      </section>

      <!-- 4. Historial de promociones -->
      <section class="mb-6 overflow-hidden rounded-2xl border border-line bg-white shadow-card">
        <div class="border-b border-line px-5 py-4 sm:px-6">
          <h2 class="text-[16px] font-extrabold text-ink-900">Historial de promociones</h2>
          <p class="mt-1 text-[13px] text-muted">
            Consulta las promociones finalizadas y sus períodos de vigencia.
          </p>
        </div>

        @if (historyPromotions().length === 0) {
          <div class="px-5 py-10 text-center text-[13px] text-muted">
            Todavía no hay promociones en el historial.
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr class="border-b border-line bg-surface/60">
                  @for (header of historyHeaders; track header) {
                    <th class="px-5 py-3.5 text-[11.5px] font-bold uppercase tracking-wide text-muted">
                      {{ header }}
                    </th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (promotion of historyPromotions(); track promotion.id) {
                  <tr class="border-b border-line/70 last:border-0 hover:bg-surface">
                    <td class="px-5 py-3.5 text-sm font-semibold text-ink-900">
                      {{ promotion.vacancyTitle || 'Vacante' }}
                    </td>
                    <td class="px-5 py-3.5 text-[13px] text-muted">
                      {{ promotion.planName || '—' }}
                    </td>
                    <td class="px-5 py-3.5 text-[13px] text-muted">
                      {{ promotion.startsAt ? (promotion.startsAt | date: 'dd/MM/yyyy') : '—' }}
                    </td>
                    <td class="px-5 py-3.5 text-[13px] text-muted">
                      {{ promotion.endsAt ? (promotion.endsAt | date: 'dd/MM/yyyy') : '—' }}
                    </td>
                    <td class="px-5 py-3.5">
                      <span class="rounded-md bg-surface px-2 py-1 text-[11.5px] font-bold text-muted">
                        {{ statusOf(promotion.status) }}
                      </span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>

      <!-- 5. ¿Cómo funcionan las promociones? -->
      <section class="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6">
        <h2 class="text-[16px] font-extrabold text-ink-900">¿Cómo funciona?</h2>
        <div class="mt-4 grid gap-4 md:grid-cols-3">
          <div class="rounded-xl bg-surface p-4">
            <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-strong">
              <ij-icon name="search" [size]="20" />
            </span>
            <h3 class="mt-3 text-[14px] font-bold text-ink-900">Selecciona</h3>
            <p class="mt-1 text-[12.5px] leading-relaxed text-muted">
              Elige una vacante activa y sin promoción vigente.
            </p>
          </div>
          <div class="rounded-xl bg-surface p-4">
            <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-strong">
              <ij-icon name="award" [size]="20" />
            </span>
            <h3 class="mt-3 text-[14px] font-bold text-ink-900">Activa</h3>
            <p class="mt-1 text-[12.5px] leading-relaxed text-muted">
              Consume un cupo de tu plan.
            </p>
          </div>
          <div class="rounded-xl bg-surface p-4">
            <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-strong">
              <ij-icon name="eye" [size]="20" />
            </span>
            <h3 class="mt-3 text-[14px] font-bold text-ink-900">Destaca</h3>
            <p class="mt-1 text-[12.5px] leading-relaxed text-muted">
              Tu vacante gana visibilidad durante la vigencia de la promoción.
            </p>
          </div>
        </div>
      </section>
    </div>

    <!-- Modal: activar una promoción con un cupo del plan -->
    @if (showActivate()) {
      <ij-modal
        title="Promocionar vacante"
        subtitle="Se consumirá 1 promoción de tu plan."
        size="sm"
        (close)="closeActivate()"
      >
        @switch (facade.eligibleState()) {
          @case ('loading') {
            <div class="flex items-center justify-center gap-3 py-8 text-[13px] text-muted">
              <ij-spinner size="sm" />
              Buscando vacantes elegibles…
            </div>
          }
          @case ('error') {
            <p class="rounded-xl bg-red-50 px-4 py-3 text-[13px] font-medium text-red-700">
              No pudimos consultar tus vacantes. Intenta de nuevo.
            </p>
          }
          @default {
            @if (eligibleOptions().length === 0) {
              <div class="rounded-xl bg-surface px-4 py-6 text-center">
                <p class="text-[14px] font-bold text-ink-900">No hay vacantes elegibles</p>
                <p class="mt-1 text-[13px] text-muted">
                  Publica una vacante activa o espera a que termine la promoción vigente.
                </p>
              </div>
            } @else {
              <ij-select
                label="Vacante a promocionar"
                name="vacancy"
                [required]="true"
                [options]="eligibleOptions()"
                [searchable]="true"
                [ngModel]="selectedVacancyId()"
                (ngModelChange)="selectedVacancyId.set($event)"
              />

              @if (selectedVacancy(); as vacancy) {
                <dl class="mt-4 flex flex-col gap-2 rounded-xl bg-surface px-4 py-3 text-[13px]">
                  <div class="flex items-center justify-between gap-3">
                    <dt class="text-muted">Duración</dt>
                    <dd class="font-semibold text-ink-900">
                      {{ durationDays() ? durationDays() + ' días' : 'Según tu plan' }}
                    </dd>
                  </div>
                  <div class="flex items-center justify-between gap-3">
                    <dt class="text-muted">Finalización prevista</dt>
                    <dd class="font-semibold text-ink-900">
                      {{ estimatedEnd() ? (estimatedEnd() | date: 'dd/MM/yyyy') : '—' }}
                    </dd>
                  </div>
                  <div class="flex items-center justify-between gap-3">
                    <dt class="text-muted">Cupos que consume</dt>
                    <dd class="font-semibold text-ink-900">1</dd>
                  </div>
                  <div class="flex items-center justify-between gap-3">
                    <dt class="text-muted">Disponibles después</dt>
                    <dd class="font-semibold text-ink-900">{{ availableAfter() }}</dd>
                  </div>
                </dl>

                @if (endAfterVacancy()) {
                  <p class="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-[12.5px] font-medium text-amber-800">
                    La vacante vence antes de que termine la promoción. Elige otra o amplía su vigencia.
                  </p>
                }
              }

              <div class="mt-5 flex justify-end gap-3 border-t border-line pt-4">
                <button
                  type="button"
                  class="rounded-xl border border-line bg-white px-4 py-2.5 text-[13px] font-bold text-body hover:bg-surface"
                  (click)="closeActivate()"
                >
                  Cancelar
                </button>
                <button
                  ij-button
                  type="button"
                  variant="primary"
                  shape="rounded"
                  size="md"
                  [disabled]="!canConfirm()"
                  (click)="activate()"
                >
                  {{ activating() ? 'Activando…' : 'Activar promoción' }}
                </button>
              </div>
            }
          }
        }
      </ij-modal>
    }

    <!-- Compra/renovación del plan: sólo cuando se pide desde /planes. -->
    @if (showSubscriptionForm()) {
      <ij-modal
        title="Gestionar mi plan"
        subtitle="Elige el plan y cómo pagarlo."
        size="lg"
        (close)="closeForms()"
      >
        <app-subscription-form
          [plans]="facade.subscriptionPlans()"
          [paymentOptions]="facade.paymentOptions()"
          [initialPlanId]="initialPlanId()"
          [submitting]="saving()"
          [error]="formError()"
          (save)="onSubscribe($event)"
          (cancel)="closeForms()"
        />
      </ij-modal>
    }

    <!-- Compra puntual de una promoción (plan por publicación) desde /planes. -->
    @if (showPromotionPurchase()) {
      <ij-modal
        title="Promocionar una vacante"
        subtitle="Elige la vacante, el plan y cómo pagarlo."
        size="lg"
        (close)="closeForms()"
      >
        <app-promotion-form
          [vacancies]="vacancyOptions()"
          [plans]="facade.perPublicationPlans()"
          [paymentOptions]="facade.paymentOptions()"
          [initialPlanId]="initialPlanId()"
          [creditMode]="false"
          [submitting]="saving()"
          [error]="formError()"
          (save)="onPromote($event)"
          (cancel)="closeForms()"
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
            <dd class="text-[13.5px] text-body">{{ methodOf(result.order.paymentMethod) }}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-[13px] text-muted">Folio</dt>
            <dd class="text-[13.5px] font-mono text-body">{{ folio(result.order.id) }}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-[13px] text-muted">Estado</dt>
            <dd class="text-[13.5px] text-body">{{ paymentOf(result.order.paymentStatus) }}</dd>
          </div>
          @if (result.order.voucherReference; as reference) {
            <div class="flex justify-between gap-3">
              <dt class="text-[13px] text-muted">Referencia</dt>
              <dd class="text-[13.5px] font-mono text-body">{{ reference }}</dd>
            </div>
          }
        </dl>

        <p class="mt-4 rounded-xl bg-surface px-4 py-3 text-[12.5px] text-muted">
          {{ isManual(result.order)
            ? 'Nuestro equipo verificará el cobro y te avisaremos en cuanto quede activa. Si pagas por transferencia, indica el folio en el concepto.'
            : 'La activación se confirmará automáticamente cuando la pasarela avise del pago.' }}
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
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly activeHeaders = [
    'Vacante',
    'Inicio',
    'Finalización',
    'Días restantes',
    'Estado',
    'Acciones',
  ];
  protected readonly historyHeaders = [
    'Vacante',
    'Plan',
    'Inicio',
    'Finalización',
    'Estado',
  ];

  protected readonly showActivate = signal(false);
  protected readonly showSubscriptionForm = signal(false);
  protected readonly showPromotionPurchase = signal(false);
  protected readonly checkout = signal<Checkout | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly activating = signal(false);
  protected readonly selectedVacancyId = signal('');
  protected readonly initialPlanId = signal<string | null>(null);

  private readonly requestedPlanId = signal<string | null>(
    this.route.snapshot.queryParamMap.get('plan'),
  );

  protected readonly planSummary = computed(() => this.facade.summary());
  protected readonly plan = computed(
    () => this.facade.summary()?.subscription ?? null,
  );
  protected readonly hasActivePlan = computed(
    () => this.plan()?.status === 'ACTIVE',
  );
  protected readonly available = computed(
    () => this.facade.summary()?.promotionsAvailable ?? 0,
  );
  protected readonly durationDays = computed(
    () => this.facade.summary()?.promotionDurationDays ?? null,
  );
  protected readonly canPromote = computed(
    () => this.hasActivePlan() && this.available() > 0,
  );
  protected readonly availableAfter = computed(() =>
    Math.max(0, this.available() - 1),
  );

  protected readonly activePromotions = computed(() =>
    this.facade.promotions().filter((promotion) => promotion.status === 'ACTIVE'),
  );
  protected readonly historyPromotions = computed(() =>
    this.facade.promotions().filter(
      (promotion) =>
        // `startsAt` distingue una promoción que existió de una compra
        // cancelada antes de activarse. Esa compra no es historial de
        // promociones: es una orden fallida, y se consulta en pagos.
        promotion.startsAt !== null &&
        (promotion.status === 'EXPIRED' || promotion.status === 'CANCELLED'),
    ),
  );

  protected readonly eligibleOptions = computed<readonly IjOption[]>(() =>
    this.facade.eligibleVacancies().map((vacancy) => ({
      value: vacancy.id,
      label: vacancy.title,
    })),
  );
  protected readonly selectedVacancy = computed(() =>
    this.facade
      .eligibleVacancies()
      .find((vacancy) => vacancy.id === this.selectedVacancyId()) ?? null,
  );
  protected readonly estimatedEnd = computed(() => {
    const days = this.durationDays();
    if (!days) return null;
    const end = new Date();
    end.setDate(end.getDate() + days);
    return end;
  });
  protected readonly endAfterVacancy = computed(() => {
    const end = this.estimatedEnd();
    const vacancy = this.selectedVacancy();
    if (!end || !vacancy?.expiresAt) return false;
    return new Date(vacancy.expiresAt).getTime() < end.getTime();
  });
  protected readonly canConfirm = computed(
    () =>
      Boolean(this.selectedVacancyId()) &&
      this.canPromote() &&
      !this.endAfterVacancy() &&
      !this.activating(),
  );

  private readonly vacancies = signal<readonly IjOption[]>([]);
  protected readonly vacancyOptions = computed(() => this.vacancies());

  constructor() {
    this.facade.loadSummary();
    this.facade.loadPromotions(1);
    this.facade.loadPlans();
    this.facade.loadPaymentOptions();
    this.handleCheckoutReturn();

    // Vacantes para la compra puntual desde /planes (no para el modal de cupos).
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

    effect(() => {
      const planId = this.requestedPlanId();
      if (!planId) return;
      if (!this.facade.plansLoaded()) return;
      untracked(() => this.openRequestedPlan(planId));
    });
  }

  protected statusOf(status: string): string {
    return (
      PROMOTION_STATUS_LABELS[status] ??
      SUBSCRIPTION_STATUS_LABELS[status] ??
      status
    );
  }

  protected planStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      ACTIVE: 'Activo',
      PENDING_PAYMENT: 'Pendiente de pago',
      PAST_DUE: 'Vencido',
      CANCELLED: 'Cancelado',
      EXPIRED: 'Expirado',
    };
    return labels[status] ?? status;
  }

  protected planStatusClass(status: string): string {
    switch (status) {
      case 'ACTIVE':
        return 'bg-accent-green-soft text-accent-green';
      case 'PENDING_PAYMENT':
        return 'bg-accent-amber-soft text-accent-amber-strong';
      default:
        return 'bg-surface text-muted';
    }
  }

  protected daysRemaining(promotion: PromotionListItem): number {
    if (!promotion.endsAt) return 0;
    return Math.max(
      0,
      Math.ceil((new Date(promotion.endsAt).getTime() - Date.now()) / DAY_MS),
    );
  }

  protected openActivate(): void {
    if (!this.canPromote()) return;
    this.actionError.set(null);
    this.selectedVacancyId.set('');
    this.facade.loadEligibleVacancies();
    this.showActivate.set(true);
  }

  protected closeActivate(): void {
    this.showActivate.set(false);
  }

  protected activate(): void {
    if (!this.canConfirm()) return;
    this.activating.set(true);
    this.facade
      .createPromotion(this.selectedVacancyId(), null, true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.activating.set(false);
          this.showActivate.set(false);
          this.notice.set('Promoción activada. La vacante ya tiene mayor visibilidad.');
          this.facade.loadSummary();
          this.facade.loadEligibleVacancies();
        },
        error: (error: unknown) => {
          this.activating.set(false);
          this.actionError.set(
            this.messageOf(error, 'No se pudo activar la promoción.'),
          );
        },
      });
  }

  private openRequestedPlan(planId: string): void {
    this.requestedPlanId.set(null);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { plan: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });

    const plan = this.facade.plans().find((item) => item.id === planId);
    if (!plan) {
      this.actionError.set('Ese plan ya no está disponible. Elige otro de la lista.');
      return;
    }

    if (plan.planType === 'PER_PUBLICATION') {
      // Si hay cupos, se usa la promoción del plan; si no, se compra puntual.
      if (this.canPromote()) {
        this.openActivate();
        return;
      }
      this.initialPlanId.set(plan.id);
      this.showPromotionPurchase.set(true);
      return;
    }

    this.initialPlanId.set(plan.id);
    this.showSubscriptionForm.set(true);
  }

  protected closeForms(): void {
    this.showSubscriptionForm.set(false);
    this.showPromotionPurchase.set(false);
    this.formError.set(null);
  }

  protected onSubscribe(request: SubscriptionRequest): void {
    this.saving.set(true);
    this.formError.set(null);
    this.facade
      .createSubscription(
        request.planId,
        request.method,
        request.provider,
        request.recurringConsent,
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => this.onCheckoutOpened(result),
        error: (error: unknown) => {
          this.saving.set(false);
          this.formError.set(
            this.messageOf(error, 'No se pudo contratar la suscripción.'),
          );
        },
      });
  }

  protected onPromote(request: PromotionRequest): void {
    this.saving.set(true);
    this.formError.set(null);
    this.facade
      .createPromotion(request.vacancyId, request.planId)
      .pipe(
        switchMap((promotion: Promotion) =>
          this.facade.checkout(promotion.id, request.method, request.provider),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (result) => this.onCheckoutOpened(result),
        error: (error: unknown) => {
          this.saving.set(false);
          this.formError.set(
            this.messageOf(error, 'No se pudo contratar la promoción.'),
          );
        },
      });
  }

  private onCheckoutOpened(result: Checkout): void {
    if (result.checkoutUrl) {
      window.location.assign(result.checkoutUrl);
      return;
    }
    this.saving.set(false);
    this.closeForms();
    this.checkout.set(result);
  }

  /**
   * Vuelta del Checkout de Stripe (`?checkout=success|cancelled&order=`).
   * La activación la hace el webhook; aquí sólo se refresca y se libera una
   * reserva si el usuario canceló.
   */
  private handleCheckoutReturn(): void {
    const params = this.route.snapshot.queryParamMap;
    const result = params.get('checkout');
    const orderId = params.get('order');
    if (!result) return;

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { checkout: null, order: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });

    if (result === 'success') {
      this.notice.set(
        'Recibimos tu pago. En unos segundos verás tu compra activa; si pagaste con OXXO, se activará cuando se acredite.',
      );
      const timers = [3000, 8000].map((delay) =>
        setTimeout(() => {
          this.facade.loadPromotions(1);
          this.facade.loadSummary();
        }, delay),
      );
      this.destroyRef.onDestroy(() => timers.forEach(clearTimeout));
      return;
    }

    if (result === 'cancelled' && orderId) {
      this.facade
        .cancelPayment(orderId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () =>
            this.notice.set('Cancelaste el pago. No se hizo ningún cargo.'),
          error: () =>
            this.actionError.set(
              'Cancelaste el pago, pero no pudimos liberar la compra. Se liberará sola en una hora.',
            ),
        });
    }
  }

  protected folio(orderId: string): string {
    return orderFolio(orderId);
  }

  protected methodOf(method: string): string {
    return (
      PAYMENT_METHOD_LABELS[method as keyof typeof PAYMENT_METHOD_LABELS] ??
      method
    );
  }

  protected paymentOf(status: string): string {
    return PAYMENT_STATUS_LABELS[status] ?? status;
  }

  protected isManual(order: Checkout['order']): boolean {
    return isManualOrder(order);
  }

  private messageOf(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as ApiErrorResponse | null;
      return body?.errors?.[0]?.message ?? body?.message ?? fallback;
    }
    return fallback;
  }
}
