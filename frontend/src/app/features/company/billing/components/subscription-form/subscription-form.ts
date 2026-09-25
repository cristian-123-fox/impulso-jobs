import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IjButton, IjOption, IjSelect } from '@/shared/ui';
import {
  PAYMENT_METHOD_LABELS,
  PaymentMethod,
  Plan,
} from '@/features/company/billing/models/billing.models';

/** Lo que hace falta para contratar la suscripción y abrir el cobro. */
export interface SubscriptionRequest {
  planId: string;
  method: PaymentMethod;
}

/**
 * Contratación de la suscripción anual de la empresa: plan y método de pago.
 *
 * Los métodos salen del propio plan (`paymentMethods`): para una suscripción el
 * backend ya marca OXXO y MSI como no disponibles —son pago único—, así que
 * aquí sólo se filtra, no se decide.
 */
@Component({
  selector: 'app-subscription-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, CurrencyPipe, IjButton, IjSelect],
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
              (click)="selectPlan(plan.id)"
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

      <ij-select
        label="Método de pago"
        name="method"
        [required]="true"
        [options]="methodOptions()"
        [searchable]="false"
        [hint]="methodHint()"
        [(ngModel)]="method"
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
        La suscripción se activa cuando el pago se confirma.
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
        {{ submitting() ? 'Procesando…' : 'Contratar' }}
      </button>
    </div>
  `,
})
export class SubscriptionForm implements OnInit {
  /** Planes de tipo suscripción anual. */
  readonly plans = input.required<readonly Plan[]>();
  /** Plan con el que abrir el formulario (p. ej. el elegido en `/planes`). */
  readonly initialPlanId = input<string | null>(null);
  readonly submitting = input(false);
  readonly error = input<string | null>(null);
  readonly save = output<SubscriptionRequest>();
  readonly cancel = output<void>();

  protected readonly planId = signal('');
  protected readonly method = signal<PaymentMethod>(PaymentMethod.CARD);

  protected readonly selectedPlan = computed(() =>
    this.plans().find((plan) => plan.id === this.planId()),
  );

  protected readonly methodOptions = computed<readonly IjOption[]>(() => {
    const plan = this.selectedPlan();
    if (!plan) {
      return [PaymentMethod.CARD, PaymentMethod.SPEI].map((value) => ({
        value,
        label: PAYMENT_METHOD_LABELS[value],
      }));
    }
    return plan.paymentMethods
      .filter((item) => item.available)
      .map((item) => ({
        value: item.method,
        label: PAYMENT_METHOD_LABELS[item.method] ?? item.method,
      }));
  });

  protected readonly methodHint = computed(() => {
    const plan = this.selectedPlan();
    if (!plan) return '';
    return plan.paymentMethods
      .filter((item) => !item.available)
      .map(
        (item) =>
          `${PAYMENT_METHOD_LABELS[item.method] ?? item.method}: ${item.reason ?? 'no disponible'}`,
      )
      .join(' · ');
  });

  protected readonly canSubmit = computed(() => {
    const plan = this.selectedPlan();
    if (!plan) return false;
    return plan.paymentMethods.some(
      (item) => item.method === this.method() && item.available,
    );
  });

  ngOnInit(): void {
    const initial = this.initialPlanId();
    const plans = this.plans();
    const start =
      plans.find((plan) => plan.id === initial) ??
      (plans.length === 1 ? plans[0] : undefined);
    if (start) this.selectPlan(start.id);
  }

  /** Al cambiar de plan, el método se reajusta si el nuevo no lo admite. */
  protected selectPlan(planId: string): void {
    this.planId.set(planId);
    const plan = this.selectedPlan();
    const allowed = plan?.paymentMethods.filter((item) => item.available) ?? [];
    if (!allowed.some((item) => item.method === this.method()) && allowed[0]) {
      this.method.set(allowed[0].method);
    }
  }

  protected onSubmit(): void {
    if (!this.canSubmit()) return;
    this.save.emit({ planId: this.planId(), method: this.method() });
  }
}
