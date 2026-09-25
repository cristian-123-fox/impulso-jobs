import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { IjButton } from '@/shared/ui';
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
}

/**
 * Contratación de la suscripción anual de la empresa: plan y cómo pagarla.
 * Con Stripe se cobra con tarjeta y se renueva sola cada año; con la solicitud
 * de pago, el equipo confirma la transferencia.
 */
@Component({
  selector: 'app-subscription-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, IjButton, PaymentChoice],
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
          @for (plan of plans(); track plan.id) {
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
              <div class="text-[12px] text-muted">IVA incluido · anual</div>
            </button>
          } @empty {
            <p class="rounded-xl bg-surface px-4 py-5 text-center text-[13px] text-muted sm:col-span-2">
              Todavía no hay planes de suscripción disponibles.
            </p>
          }
        </div>
      </div>

      <app-payment-choice
        [plan]="selectedPlan()"
        [options]="paymentOptions()"
        [recurring]="true"
        [(provider)]="provider"
        [(method)]="method"
      />

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
          <p class="mt-2 text-[12px] text-muted">
            Vigencia de un año desde que se confirma el pago. Puedes cancelar la renovación
            automática cuando quieras y conservarás el periodo pagado.
          </p>
        </div>
      }
    </div>

    <div class="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-line pt-4">
      <p class="mr-auto text-[12.5px] text-muted">
        {{
          isOnline()
            ? 'Te llevaremos a la página segura de Stripe.'
            : 'La suscripción se activa cuando confirmemos el pago.'
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
  /** Planes de tipo suscripción anual. */
  readonly plans = input.required<readonly Plan[]>();
  readonly paymentOptions = input.required<readonly PaymentProviderOption[]>();
  /** Plan con el que abrir el formulario (p. ej. el elegido en `/planes`). */
  readonly initialPlanId = input<string | null>(null);
  readonly submitting = input(false);
  readonly error = input<string | null>(null);
  readonly save = output<SubscriptionRequest>();
  readonly cancel = output<void>();

  private readonly choice = viewChild(PaymentChoice);

  protected readonly planId = signal('');
  protected readonly provider = signal<PaymentProvider>(PaymentProvider.MANUAL);
  protected readonly method = signal<PaymentMethod>(PaymentMethod.SPEI);

  protected readonly selectedPlan = computed(() =>
    this.plans().find((plan) => plan.id === this.planId()),
  );

  protected readonly isOnline = computed(
    () => this.provider() === PaymentProvider.STRIPE,
  );

  protected readonly submitLabel = computed(() => {
    if (this.submitting()) return 'Procesando…';
    return this.isOnline() ? 'Ir a pagar' : 'Enviar solicitud';
  });

  protected readonly canSubmit = computed(
    () =>
      Boolean(this.selectedPlan()) &&
      (this.choice()?.allowedMethods().includes(this.method()) ?? false),
  );

  ngOnInit(): void {
    const initial = this.initialPlanId();
    const plans = this.plans();
    const start =
      plans.find((plan) => plan.id === initial) ??
      (plans.length === 1 ? plans[0] : undefined);
    if (start) this.planId.set(start.id);
  }

  protected onSubmit(): void {
    if (!this.canSubmit()) return;
    this.save.emit({
      planId: this.planId(),
      method: this.method(),
      provider: this.provider(),
    });
  }
}
