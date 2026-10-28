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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
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
  SubscriptionForm,
  SubscriptionRequest,
} from '@/features/company/billing/components/subscription-form/subscription-form';
import {
  Checkout,
  OPEN_PAYMENT_STATUSES,
  Order,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  PROMOTION_STATUS_LABELS,
  Plan,
  Promotion,
  SUBSCRIPTION_STATUS_LABELS,
  isManualOrder,
  orderFolio,
} from '@/features/company/billing/models/billing.models';
import { VacanciesApi } from '@/features/company/vacancies/data/vacancies.api';
import { CandidatesApi } from '@/features/company/candidates/data/candidates.api';
import { TalentQuota } from '@/features/company/candidates/models/candidates.models';
import { VacancyStatus } from '@/features/company/vacancies/models/vacancies.models';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Desde cuándo se resalta el vencimiento; espeja el umbral mayor del backend. */
const EXPIRY_WARNING_DAYS = 30;

/** A partir de aquí el aviso pasa de ámbar a rojo. */
const URGENT_DAYS = 7;

interface ExpiryNotice {
  readonly urgent: boolean;
  readonly message: string;
}

/** Promociones de vacantes y suscripción anual de la empresa. */
@Component({
  selector: 'app-promotions-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyPipe,
    DatePipe,
    AdminPagination,
    PromotionForm,
    SubscriptionForm,
    IjButton,
    IjIcon,
    IjModal,
  ],
  template: `
    <div class="mx-auto max-w-[1240px]">
      <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="text-[28px] font-extrabold leading-tight tracking-tight text-ink-900">
            Promociona tus vacantes
          </h1>
          <p class="mt-1.5 text-[14px] font-medium text-muted">
            Gestiona la visibilidad de tus ofertas laborales.
          </p>
        </div>
        <div class="flex flex-wrap gap-2.5">
          @if (canSubscribe()) {
            <button
              type="button"
              class="flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-[13.5px] font-bold text-body transition-colors hover:bg-surface hover:text-brand-strong"
              (click)="openSubscriptionForm()"
            >
              <ij-icon name="calendar" [size]="16" />
              Contratar suscripción
            </button>
          }
        </div>
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

      @if (facade.subscription(); as subscription) {
        <section class="mb-6 rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6">
          <h2 class="text-base font-bold text-ink-900 mb-3">Mi plan {{ subscription.planName || "" }}</h2>
          <p class="text-[13.5px] text-muted mb-3">Estado: <span class="inline-block rounded-md px-2 py-0.5 text-[11.5px] font-bold bg-accent-green-soft text-accent-green">{{ statusOf(subscription.status) }}</span></p>
          <div class="grid grid-cols-3 gap-3 mb-3">
            <div class="rounded-xl bg-surface px-3 py-2 text-center">
              <p class="text-[18px] font-extrabold text-ink-900">{{ subscription.promotionCredits }}</p>
              <p class="text-[11px] text-muted">Incluidas</p>
            </div>
            <div class="rounded-xl bg-surface px-3 py-2 text-center">
              <p class="text-[18px] font-extrabold text-ink-900">{{ subscription.usedPromotionCredits }}</p>
              <p class="text-[11px] text-muted">Utilizadas</p>
            </div>
            <div class="rounded-xl bg-surface px-3 py-2 text-center">
              <p class="text-[18px] font-extrabold text-ink-900">{{ subscription.promotionCredits - subscription.usedPromotionCredits }}</p>
              <p class="text-[11px] text-muted">Disponible{{ (subscription.promotionCredits - subscription.usedPromotionCredits) === 1 ? "" : "s" }}</p>
            </div>
          </div>
          <p class="text-[13px] text-muted">Duración de cada promoción: {{ subscriptionDuration() ?? "—" }} días</p>
          <p class="text-[13px] text-muted">Vigencia: {{ subscription.currentPeriodEnd ? (subscription.currentPeriodEnd | date: "dd/MM/yyyy") : "Según suscripción" }}</p>
          <div class="mt-3 h-2 w-full rounded-full bg-surface">
            <div class="h-2 rounded-full bg-brand" [style.width.%]="subscription.promotionCredits > 0 ? (subscription.usedPromotionCredits / subscription.promotionCredits) * 100 : 0"></div>
          </div>
          <p class="mt-1 text-[12px] text-muted">Renovación automática: {{ subscription.autoRenew ? "activada" : "desactivada" }}</p>
          @if (subscription.autoRenew && subscription.status !== "PENDING_PAYMENT") {
            <button type="button" class="mt-3 rounded-xl border border-line bg-white px-4 py-2.5 text-[13px] font-bold text-body hover:bg-red-50 hover:text-red-600" (click)="onCancelRenewal()">Cancelar renovación</button>
          }
        </section>
      }

      <section class="mb-6 rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6">
        <h2 class="text-base font-bold text-ink-900 mb-2">Promocionar una vacante</h2>
        <p class="mb-4 text-[13.5px] text-muted">Selecciona una vacante publicada y aumenta su visibilidad utilizando las promociones incluidas en tu plan.</p>
        <button ij-button type="button" variant="primary" shape="rounded" size="md" [disabled]="!hasActiveSubscription()" (click)="openForm()">
          <ij-icon name="award" [size]="16" />
          Promocionar vacante
        </button>
      </section>

      <div>
        <h2 class="text-[19px] font-extrabold tracking-tight text-ink-900">Mis promociones activas</h2>
        <p class="mt-1.5 text-[14px] font-medium text-muted">
          Historial de lo contratado y hasta cuándo está vigente.
        </p>
      </div>

      <section class="mt-4 overflow-hidden rounded-2xl border border-line bg-white shadow-card">
        @switch (facade.state()) {
          @case ('loading') {
            <div class="p-10 text-center text-[13.5px] text-muted">Cargando promociones…</div>
          }
          @case ('error') {
            <div class="p-10 text-center text-[13.5px] font-medium text-red-600">
              No se pudieron cargar las promociones.
            </div>
          }
          @default {
            <div class="overflow-x-auto">
              <table class="w-full min-w-[820px] border-collapse text-left">
                <thead>
                  <tr class="border-b border-line bg-surface/60">
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
                  @for (promo of activePromotions(); track promo.id) {
                    <tr class="border-b border-line/70 transition-colors hover:bg-surface">
                      <td class="px-5 py-3.5 text-sm font-semibold text-ink-900">
                        {{ promo.vacancyTitle || promo.planName || "—" }}
                      </td>
                      <td class="px-5 py-3.5 text-[13px] text-muted">
                        {{ promo.startsAt ? (promo.startsAt | date: "dd/MM/yyyy") : "—" }}
                      </td>
                      <td class="px-5 py-3.5 text-[13px] text-muted">
                        {{ promo.endsAt ? (promo.endsAt | date: "dd/MM/yyyy") : "—" }}
                      </td>
                      <td class="px-5 py-3.5 text-[13px] text-muted">
                        {{ daysRemaining(promo) }} días
                      </td>
                      <td class="px-5 py-3.5">
                        <span class="inline-block rounded-md px-2 py-1 text-[11.5px] font-bold bg-accent-green-soft text-accent-green">Activa</span>
                      </td>
                      <td class="px-5 py-3.5">
                        <button type="button" class="text-[12.5px] font-bold text-brand hover:underline" (click)="facade.loadPromotions(facade.page())">Ver detalles</button>
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
              [inCard]="true"
              [page]="facade.page()"
              [pages]="facade.pages()"
              [total]="facade.total()"
              (pageChange)="facade.loadPromotions($event)"
            />
          }
        }
      </section>
    </div>

      <!-- Historial de promociones -->
      <section class="mb-6 rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6">
        <h2 class="text-base font-bold text-ink-900 mb-2">Historial de promociones</h2>
        <p class="mb-4 text-[13.5px] text-muted">Consulta las promociones utilizadas anteriormente y su estado.</p>
        @if (historyPromotions().length === 0) {
          <div class="p-6 text-center text-[13.5px] text-muted">Sin historial de promociones.</div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr class="border-b border-line bg-surface/60">
                  <th class="px-5 py-3.5 text-[11.5px] font-bold uppercase tracking-wide text-muted">Vacante</th>
                  <th class="px-5 py-3.5 text-[11.5px] font-bold uppercase tracking-wide text-muted">Plan</th>
                  <th class="px-5 py-3.5 text-[11.5px] font-bold uppercase tracking-wide text-muted">Inicio</th>
                  <th class="px-5 py-3.5 text-[11.5px] font-bold uppercase tracking-wide text-muted">Finalización</th>
                  <th class="px-5 py-3.5 text-[11.5px] font-bold uppercase tracking-wide text-muted">Estado</th>
                </tr>
              </thead>
              <tbody>
                @for (promo of historyPromotions(); track promo.id) {
                  <tr class="border-b border-line/70 hover:bg-surface">
                    <td class="px-5 py-3.5 text-sm font-semibold text-ink-900">{{ promo.vacancyTitle || promo.planName || '—' }}</td>
                    <td class="px-5 py-3.5 text-[13px] text-muted">{{ promo.planName || '—' }}</td>
                    <td class="px-5 py-3.5 text-[13px] text-muted">{{ promo.startsAt ? (promo.startsAt | date: 'dd/MM/yyyy') : '—' }}</td>
                    <td class="px-5 py-3.5 text-[13px] text-muted">{{ promo.endsAt ? (promo.endsAt | date: 'dd/MM/yyyy') : '—' }}</td>
                    <td class="px-5 py-3.5 text-[13px] text-muted">{{ statusOf(promo.status) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>

      <!-- ¿Cómo funcionan las promociones? -->
      <section class="mb-6 rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6">
        <h2 class="text-base font-bold text-ink-900 mb-3">¿Cómo funcionan las promociones?</h2>
        <div class="grid gap-4 md:grid-cols-3">
          <div class="rounded-xl bg-surface p-4">
            <h3 class="text-[14px] font-bold text-ink-900">Selecciona tu vacante</h3>
            <p class="mt-1 text-[12.5px] text-muted">Elige una de tus vacantes activas para promocionarla.</p>
          </div>
          <div class="rounded-xl bg-surface p-4">
            <h3 class="text-[14px] font-bold text-ink-900">Activa tu promoción</h3>
            <p class="mt-1 text-[12.5px] text-muted">Utiliza uno de los cupos disponibles incluidos en tu suscripción.</p>
          </div>
          <div class="rounded-xl bg-surface p-4">
            <h3 class="text-[14px] font-bold text-ink-900">Obtén mayor visibilidad</h3>
            <p class="mt-1 text-[12.5px] text-muted">Tu vacante se mostrará como destacada durante los días establecidos en tu plan.</p>
          </div>
        </div>
        <p class="mt-4 text-[12.5px] text-muted">Al finalizar la promoción, tu vacante continuará publicada normalmente hasta su fecha de vencimiento, siempre que siga activa.</p>
      </section>

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
          [paymentOptions]="facade.paymentOptions()"
          [initialPlanId]="initialPlanId()"
          [creditMode]="hasActiveSubscription()"
          [promotionDays]="subscriptionDuration()"
          [availableCredits]="availableCredits()"
          [submitting]="saving()"
          [error]="formError()"
          (save)="onPromote($event)"
          (cancel)="closeForm()"
        />
      </ij-modal>
    }

    @if (showSubscriptionForm()) {
      <ij-modal
        title="Contratar suscripción anual"
        subtitle="Elige el plan y cómo pagarlo."
        size="lg"
        (close)="closeForm()"
      >
        <app-subscription-form
          [plans]="facade.subscriptionPlans()"
          [paymentOptions]="facade.paymentOptions()"
          [initialPlanId]="initialPlanId()"
          [submitting]="saving()"
          [error]="formError()"
          (save)="onSubscribe($event)"
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
            <dd class="text-[13.5px] text-body">{{ methodOf(result.order.paymentMethod) }}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-[13px] text-muted">Folio</dt>
            <dd class="text-[13.5px] font-mono text-body">{{ folio(result.order.id) }}</dd>
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
          {{ checkoutKind() === 'subscription' ? 'La suscripción' : 'La promoción' }}
          se activará automáticamente cuando el pago se confirme.
          @if (isManual(result.order)) {
            Nuestro equipo verificará el cobro y te avisaremos en cuanto quede activa.
            Si pagas por transferencia, indica el folio en el concepto.
          }
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
  private readonly candidatesApi = inject(CandidatesApi);
  private readonly destroyRef = inject(DestroyRef);

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly showForm = signal(false);
  protected readonly showSubscriptionForm = signal(false);
  /** Plan preseleccionado al abrir un formulario (tarjeta o `?plan=`). */
  protected readonly initialPlanId = signal<string | null>(null);
  protected readonly checkout = signal<Checkout | null>(null);
  /** Qué abrió el último cobro, para el texto del modal. */
  protected readonly checkoutKind = signal<'promotion' | 'subscription'>(
    'promotion',
  );

  /**
   * Plan que llega de `/planes` por `?plan=`. Se resuelve cuando ya se sabe
   * qué planes hay y si la empresa tiene suscripción; hasta entonces espera.
   */
  /** Aviso de éxito (vuelta del Checkout, pago cancelado). */
  protected readonly notice = signal<string | null>(null);
  /** Orden que se está retirando: evita el doble clic. */
  protected readonly cancellingId = signal<string | null>(null);
  protected readonly talentQuota = signal<TalentQuota | null>(null);

  protected readonly subscriptionPlan = computed(() => {
    const sub = this.facade.subscription();
    if (!sub) return null;
    return this.facade.plans().find((plan) => plan.id === sub.planId) ?? null;
  });

  protected readonly subscriptionDuration = computed(() => {
    const plan = this.subscriptionPlan();
    if (!plan) return null;
    const feat = plan.features?.find((f) => f.code === "publication_days");
    if (feat && feat.isIncluded && feat.value) {
      const n = Number(feat.value);
      if (Number.isFinite(n)) return n;
    }
    return plan.validityDays ?? null;
  });

  protected readonly availableCredits = computed(() => {
    const sub = this.facade.subscription();
    if (!sub) return 0;
    return (sub.promotionCredits ?? 0) - (sub.usedPromotionCredits ?? 0);
  });

  private readonly requestedPlanId = signal<string | null>(
    this.route.snapshot.queryParamMap.get('plan'),
  );

  /**
   * Sólo se contrata si no hay una suscripción viva: el backend lo rechazaría
   * con `SUBSCRIPTION_ALREADY_EXISTS`, y una pendiente de pago también cuenta.
   */
  protected readonly canSubscribe = computed(
    () =>
      this.facade.subscriptionPlans().length > 0 &&
      this.facade.subscriptionLoaded() &&
      this.facade.subscription() === null,
  );
  protected readonly hasActiveSubscription = computed(
    () => this.facade.subscription()?.status === 'ACTIVE',
  );
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);

  protected readonly headers = [
    'Vacante',
    'Inicio',
    'Finalización',
    'Días restantes',
    'Estado',
    'Acciones',
  ];

  protected readonly activePromotions = computed(() =>
    this.facade
      .promotions()
      .filter((p) => p.status === 'ACTIVE'),
  );
  protected readonly historyPromotions = computed(() =>
    this.facade
      .promotions()
      .filter((p) => p.status !== 'ACTIVE'),
  );

  protected daysRemaining(promo: Promotion): number {
    if (!promo.endsAt) return 0;
    const end = new Date(promo.endsAt).getTime();
    return Math.max(0, Math.ceil((end - Date.now()) / DAY_MS));
  }

  private readonly vacancies = signal<readonly IjOption[]>([]);
  protected readonly vacancyOptions = computed(() => this.vacancies());

  constructor() {
    this.facade.loadPlans();
    this.facade.loadPromotions(1);
    this.facade.loadSubscription();
    this.facade.loadPaymentOptions();
    this.candidatesApi
      .quota()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((q) => this.talentQuota.set(q));
    this.handleCheckoutReturn();

    effect(() => {
      const planId = this.requestedPlanId();
      if (!planId) return;
      if (!this.facade.plansLoaded() || !this.facade.subscriptionLoaded()) {
        return;
      }
      untracked(() => this.openRequestedPlan(planId));
    });

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

  /**
   * Aviso de vencimiento en la propia ficha del plan (T22). El portal no debe
   * tener relojes opacos: la fecha se muestra desde el día 1 y, al entrar en
   * la ventana de aviso, se destaca.
   *
   * El umbral espeja el mayor de `SUBSCRIPTION_EXPIRY_NOTICE_DAYS` del
   * backend (30 por defecto), que es quien manda los correos; aquí sólo se
   * decide cuándo resaltarlo.
   */
  protected readonly expiry = computed<ExpiryNotice | null>(() => {
    const subscription = this.facade.subscription();
    const endsAt = subscription?.currentPeriodEnd;
    if (!endsAt) return null;

    const end = new Date(endsAt).getTime();
    if (Number.isNaN(end)) return null;

    const daysLeft = Math.ceil((end - Date.now()) / DAY_MS);
    if (daysLeft <= 0) {
      return {
        urgent: true,
        message: 'Tu plan venció. Renuévalo para recuperar los beneficios.',
      };
    }
    if (daysLeft > EXPIRY_WARNING_DAYS) return null;

    const when = daysLeft === 1 ? 'mañana' : `en ${daysLeft} días`;
    return {
      urgent: daysLeft <= URGENT_DAYS,
      message: `Tu plan vence ${when}. Renuévalo para no perder los beneficios.`,
    };
  });

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

  protected openForm(planId: string | null = null): void {
    this.formError.set(null);
    this.initialPlanId.set(planId);
    this.showForm.set(true);
  }

  protected openSubscriptionForm(planId: string | null = null): void {
    this.formError.set(null);
    this.initialPlanId.set(planId);
    this.showSubscriptionForm.set(true);
  }

  protected closeForm(): void {
    this.showForm.set(false);
    this.showSubscriptionForm.set(false);
    this.formError.set(null);
  }

  protected onSubscribe(request: SubscriptionRequest): void {
    this.saving.set(true);
    this.formError.set(null);
    this.facade
      .createSubscription(request.planId, request.method, request.provider)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => this.onCheckoutOpened(result, 'subscription'),
        error: (error: unknown) => {
          this.saving.set(false);
          this.formError.set(
            this.messageOf(error, 'No se pudo contratar la suscripción.'),
          );
        },
      });
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

  protected isManual(order: Order): boolean {
    return isManualOrder(order);
  }

  protected pendingHint(order: Order): string {
    return isManualOrder(order)
      ? 'Nuestro equipo está verificando el cobro; te avisaremos en cuanto se active. Si pagas por transferencia, indica el folio en el concepto.'
      : 'Estamos esperando la confirmación de Stripe. Si pagaste con OXXO, se activará cuando se acredite el pago.';
  }

  protected isOpen(order: Order): boolean {
    return OPEN_PAYMENT_STATUSES.includes(order.paymentStatus);
  }

  protected cancelPayment(order: Order): void {
    this.actionError.set(null);
    this.cancellingId.set(order.id);
    this.facade
      .cancelPayment(order.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.cancellingId.set(null);
          this.notice.set('Cancelaste el pago. No se hizo ningún cargo y puedes volver a contratar.');
        },
        error: (error: unknown) => {
          this.cancellingId.set(null);
          this.actionError.set(this.messageOf(error, 'No se pudo cancelar el pago.'));
        },
      });
  }

  /**
   * Con Stripe el cobro sigue en su página: se redirige en la misma pestaña,
   * que es a donde Stripe devolverá. La solicitud de pago no sale de aquí:
   * se enseña el folio en el modal.
   */
  private onCheckoutOpened(
    result: Checkout,
    kind: 'promotion' | 'subscription',
  ): void {
    if (result.checkoutUrl) {
      window.location.assign(result.checkoutUrl);
      return;
    }
    this.saving.set(false);
    this.closeForm();
    this.checkoutKind.set(kind);
    this.checkout.set(result);
  }

  /**
   * Vuelta del Checkout de Stripe (`?checkout=success|cancelled&order=`).
   *
   * - **success** no activa nada: lo hace el webhook, que suele llegar antes
   *   que el usuario pero no siempre. Se avisa y se recarga un par de veces.
   * - **cancelled** retira la orden en el acto, para que la vacante o la
   *   suscripción no queden reservadas la hora que tarda en caducar la sesión.
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
          this.facade.loadPromotions(this.facade.page());
          this.facade.loadSubscription();
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
            this.notice.set('Cancelaste el pago. No se hizo ningún cargo y puedes volver a intentarlo.'),
          error: () =>
            this.actionError.set(
              'Cancelaste el pago, pero no pudimos liberar la compra. Se liberará sola en una hora.',
            ),
        });
    }
  }

  /**
   * Abre el formulario que corresponde al plan elegido en `/planes` y limpia
   * el parámetro, para que recargar la página no lo vuelva a abrir.
   */
  private openRequestedPlan(planId: string): void {
    this.requestedPlanId.set(null);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { plan: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });

    const plan: Plan | undefined = this.facade
      .plans()
      .find((item) => item.id === planId);
    if (!plan) {
      this.actionError.set(
        'Ese plan ya no está disponible. Elige otro de la lista.',
      );
      return;
    }
    if (plan.planType === 'PER_PUBLICATION') {
      this.openForm(plan.id);
      return;
    }
    if (this.canSubscribe()) {
      this.openSubscriptionForm(plan.id);
      return;
    }
    this.actionError.set(
      'Tu empresa ya tiene una suscripción en curso; podrás contratar otra cuando termine.',
    );
  }

  /**
   * Contratar son dos pasos en el backend: crear la promoción (queda pendiente
   * de pago) y abrir el cobro. Se encadenan para que el usuario lo viva como
   * uno solo.
   */
  protected onPromote(request: PromotionRequest): void {
    this.saving.set(true);
    this.formError.set(null);

    if (this.hasActiveSubscription()) {
      this.facade
        .createPromotion(request.vacancyId, null, true)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.closeForm();
            this.notice.set('Vacante promocionada con un crédito de tu suscripción.');
            this.facade.loadPromotions(1);
          },
          error: (error: unknown) => {
            this.saving.set(false);
            this.formError.set(
              this.messageOf(error, 'No se pudo promocionar la vacante.'),
            );
          },
        });
      return;
    }

    this.facade
      .createPromotion(request.vacancyId, request.planId)
      .pipe(
        switchMap((promotion: Promotion) =>
          this.facade.checkout(promotion.id, request.method, request.provider),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (result) => this.onCheckoutOpened(result, 'promotion'),
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
