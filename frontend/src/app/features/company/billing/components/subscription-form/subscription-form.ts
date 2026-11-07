import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { IjButton, IjProviderInfo } from '@/shared/ui';
import { BillingApi } from '@/features/company/billing/data/billing.api';
import { PaymentChoice } from '@/features/company/billing/components/payment-choice/payment-choice';
import {
  PaymentMethod,
  PaymentProvider,
  PaymentProviderOption,
  Plan,
} from '@/features/company/billing/models/billing.models';

/** Lo que hace falta para contratar la suscripción y abrir el cobro. */
export interface SubscriptionRequest {
  planId: string;
  method: PaymentMethod;
  provider: PaymentProvider;
  /** Aceptación expresa del cobro recurrente (sólo con Stripe). */
  recurringConsent: boolean;
}

/**
 * Contratación de la suscripción anual de la empresa: plan y cómo pagarla.
 * Con Stripe se cobra con tarjeta y se renueva sola cada año; con la solicitud
 * de pago, el equipo confirma la transferencia.
 */
@Component({
  selector: 'app-subscription-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, RouterLink, IjButton, IjProviderInfo, PaymentChoice],
  template: `
    @if (error()) {
      <p
        role="alert"
        class="mb-4 rounded-lg bg-red-50 px-3 py-2 text-[13px] font-medium text-red-700"
      >
        {{ error() }}
      </p>
    }

    <div class="flex flex-col gap-4">
      <div>
        <span class="mb-2 block text-[13px] font-bold text-ink-900">Plan</span>
        <div class="grid gap-3 sm:grid-cols-2">
          @for (plan of effectivePlans(); track plan.id) {
            <button
              type="button"
              class="rounded-xl border-2 p-4 text-left transition-colors"
              [class]="
                planId() === plan.id
                  ? 'border-brand bg-brand-50'
                  : 'border-line bg-white hover:bg-surface'
              "
              (click)="planId.set(plan.id)"
            >
              <div class="flex items-baseline justify-between gap-2">
                <span class="text-[14px] font-bold text-ink-900">{{ plan.name }}</span>
                @if (plan.isPopular) {
                  <span class="rounded-md bg-accent-amber-soft px-1.5 py-0.5 text-[10.5px] font-bold text-[#b26a15]">
                    Popular
                  </span>
                }
              </div>
              <div class="mt-1 text-[17px] font-extrabold text-brand">
                {{ plan.price.total | currency: plan.price.currency : 'symbol-narrow' : '1.2-2' }}
              </div>
              <div class="text-[12px] text-muted">
                IVA incluido ·
                {{
                  plan.planType === 'ANNUAL_SUBSCRIPTION'
                    ? 'anual'
                    : plan.validityDays
                      ? plan.validityDays + ' días'
                      : 'según plan'
                }}
              </div>
            </button>
          } @empty {
            <div
              class="rounded-xl bg-surface px-4 py-5 text-center text-[13px] text-muted sm:col-span-2"
            >
              <p>Todavía no hay planes disponibles.</p>
              <button
                type="button"
                class="mt-2 font-bold text-brand-strong underline"
                (click)="retry()"
              >
                Reintentar
              </button>
            </div>
          }
        </div>
      </div>

      @if (selectedPlan(); as plan) {
        <div class="rounded-xl bg-surface px-4 py-3.5">
          <div class="flex flex-wrap items-baseline justify-between gap-2">
            <span class="text-[12.5px] font-semibold text-muted">
              {{ plan.price.subtotal | currency: plan.price.currency : 'symbol-narrow' : '1.2-2' }}
              + {{ plan.price.taxAmount | currency: plan.price.currency : 'symbol-narrow' : '1.2-2' }}
              de IVA
            </span>
            <span class="text-lg font-extrabold text-ink-900">
              {{ plan.price.total | currency: plan.price.currency : 'symbol-narrow' : '1.2-2' }}
            </span>
          </div>
          @if (isAnnual()) {
            <p class="mt-2 text-[12px] text-muted">
              Vigencia de un año desde que se confirma el pago. Puedes cancelar la
              renovación automática cuando quieras y conservarás el periodo pagado.
            </p>
          } @else {
            <p class="mt-2 text-[12px] text-muted">
              Vigencia de {{ plan.validityDays ?? 30 }} días desde que se confirma
              el pago. Incluye {{ plan.postingQuota ?? 1 }} publicación(es) y las
              promociones configuradas en el plan.
            </p>
          }
        </div>

        <app-payment-choice
          [plan]="selectedPlan()"
          [options]="effectiveOptions()"
          [recurring]="isAnnual()"
          [(provider)]="provider"
          [(method)]="method"
        />

        <ij-provider-info
          [total]="plan.price.total"
          [currency]="plan.price.currency"
        />

        @if (isAnnual() && isOnline()) {
          <label class="flex items-start gap-2.5 rounded-xl border border-line bg-white px-4 py-3 text-[12.5px] leading-relaxed text-body">
            <input
              type="checkbox"
              class="mt-0.5 h-4 w-4 rounded border-line text-brand focus:ring-brand"
              [checked]="recurringConsent()"
              (change)="recurringConsent.set($any($event.target).checked)"
            />
            <span>
              Autorizo expresamente el cobro recurrente anual con mi tarjeta y
              entiendo que la suscripción se renueva sola hasta que cancele la
              renovación desde mi cuenta. Puedo cancelar en cualquier momento sin
              penalización; consulta los
              <a
                routerLink="/legal/terminos-y-condiciones"
                target="_blank"
                class="font-semibold text-brand-strong hover:underline"
                >Términos y condiciones</a
              >.
            </span>
          </label>
        }
      }
    </div>

    <div class="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-line pt-4">
      <p class="mr-auto text-[12.5px] text-muted">
        {{
          isOnline()
            ? 'Te llevaremos a la página segura de Stripe.'
            : isAnnual()
              ? 'La suscripción se activa cuando confirmemos el pago.'
              : 'El plan se activa cuando confirmemos el pago.'
        }}
      </p>
      <button
        type="button"
        class="rounded-xl border border-line bg-white px-4 py-2.5 text-[13.5px] font-bold text-body transition-colors hover:bg-surface"
        (click)="cancel.emit()"
      >
        Cancelar
      </button>
      <button
        ij-button
        type="button"
        variant="primary"
        shape="rounded"
        size="md"
        [disabled]="submitting() || !canSubmit()"
        (click)="onSubmit()"
      >
        {{ submitLabel() }}
      </button>
    </div>
  `,
})
export class SubscriptionForm implements OnInit {
  /** Planes contratables. Si llegan vacíos o incompletos, el formulario los pide. */
  readonly plans = input.required<readonly Plan[]>();
  readonly paymentOptions = input.required<readonly PaymentProviderOption[]>();
  /** Plan con el que abrir el formulario (p. ej. el elegido en `/planes`). */
  readonly initialPlanId = input<string | null>(null);
  readonly submitting = input(false);
  readonly error = input<string | null>(null);
  readonly save = output<SubscriptionRequest>();
  readonly cancel = output<void>();
  /** Fuerza una recarga del catálogo si llegó vacío o inválido. */
  readonly reload = output<void>();

  private readonly api = inject(BillingApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly choice = viewChild(PaymentChoice);
  /** Copia local: el modal no depende de que el padre tenga el estado fresco. */
  private readonly localPlans = signal<readonly Plan[]>([]);
  private readonly localOptions = signal<readonly PaymentProviderOption[]>([]);

  protected readonly planId = signal('');
  protected readonly provider = signal<PaymentProvider>(PaymentProvider.MANUAL);
  protected readonly method = signal<PaymentMethod>(PaymentMethod.SPEI);
  /** Debe empezar en `false`: la ley prohíbe la casilla premarcada. */
  protected readonly recurringConsent = signal(false);

  /** Planes del padre si son válidos; si no, los que cargó el formulario. */
  protected readonly effectivePlans = computed(() => {
    const fromInput = this.validPlans(this.plans());
    return fromInput.length > 0 ? fromInput : this.localPlans();
  });

  protected readonly effectiveOptions = computed(() => {
    const fromInput = this.paymentOptions();
    return fromInput.length > 0 ? fromInput : this.localOptions();
  });

  protected readonly selectedPlan = computed(() =>
    this.effectivePlans().find((plan) => plan.id === this.planId()),
  );

  protected readonly isOnline = computed(
    () => this.provider() === PaymentProvider.STRIPE,
  );

  /** Sólo el plan anual renueva solo y exige consentimiento de cobro. */
  protected readonly isAnnual = computed(
    () => this.selectedPlan()?.planType === 'ANNUAL_SUBSCRIPTION',
  );

  protected readonly submitLabel = computed(() => {
    if (this.submitting()) return 'Procesando…';
    return this.isOnline() ? 'Ir a pagar' : 'Enviar solicitud';
  });

  protected readonly canSubmit = computed(
    () =>
      Boolean(this.selectedPlan()) &&
      (this.choice()?.allowedMethods().includes(this.method()) ?? false) &&
      (!this.isOnline() || !this.isAnnual() || this.recurringConsent()),
  );

  constructor() {
    // Cuando llegan los planes (del padre o de la API), selecciona el plan
    // solicitado o el único disponible. Si el usuario ya eligió, no lo pisa.
    effect(() => {
      const plans = this.effectivePlans();
      const initial = this.initialPlanId();
      if (this.planId() || plans.length === 0) return;

      const start =
        plans.find((plan) => plan.id === initial) ??
        (plans.length === 1 ? plans[0] : undefined);
      if (start) this.planId.set(start.id);
    });
  }

  ngOnInit(): void {
    // El catálogo del padre puede venir vacío o con datos viejos; en ese caso
    // el modal lo pide por su cuenta para no quedarse en blanco.
    if (this.validPlans(this.plans()).length === 0) this.loadPlans();
    if (this.paymentOptions().length === 0) this.loadOptions();
  }

  protected retry(): void {
    this.loadPlans();
    this.loadOptions();
    this.reload.emit();
  }

  private validPlans(plans: readonly Plan[]): readonly Plan[] {
    return plans.filter(
      (plan) =>
        plan &&
        typeof plan.name === 'string' &&
        plan.price &&
        typeof plan.price.total === 'number',
    );
  }

  private loadPlans(): void {
    this.api
      .listPlans()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (plans) => this.localPlans.set(this.validPlans(plans)),
        error: () => this.localPlans.set([]),
      });
  }

  private loadOptions(): void {
    this.api
      .paymentOptions()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (options) =>
          this.localOptions.set(
            Array.isArray(options) && options.length > 0
              ? options
              : this.fallbackOptions(),
          ),
        error: () => this.localOptions.set(this.fallbackOptions()),
      });
  }

  private fallbackOptions(): PaymentProviderOption[] {
    return [
      {
        provider: PaymentProvider.MANUAL,
        methods: [PaymentMethod.SPEI],
        recurringMethods: [PaymentMethod.SPEI],
      },
    ];
  }

  protected onSubmit(): void {
    if (!this.canSubmit()) return;
    this.save.emit({
      planId: this.planId(),
      method: this.method(),
      provider: this.provider(),
      recurringConsent: this.isAnnual() ? this.recurringConsent() : false,
    });
  }
}
