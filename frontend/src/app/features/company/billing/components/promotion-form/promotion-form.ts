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
import { FormsModule } from '@angular/forms';
import { IjButton, IjOption, IjSelect } from '@/shared/ui';
import { PaymentChoice } from '@/features/company/billing/components/payment-choice/payment-choice';
import {
  PaymentMethod,
  PaymentProvider,
  PaymentProviderOption,
  Plan,
} from '@/features/company/billing/models/billing.models';

/** Lo que hace falta para promocionar una vacante y abrir el cobro. */
export interface PromotionRequest {
  vacancyId: string;
  planId: string;
  method: PaymentMethod;
  provider: PaymentProvider;
}

/**
 * Compra de una promoción: vacante, plan y cómo pagarla. Con Stripe, el plazo
 * de los meses sin intereses lo elige el cliente en la página de pago, así que
 * aquí no se pregunta.
 */
@Component({
  selector: 'app-promotion-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, CurrencyPipe, IjButton, IjSelect, PaymentChoice],
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
      <ij-select
        label="Vacante a promocionar"
        name="vacancy"
        [required]="true"
        [options]="vacancies()"
        [hint]="vacancies().length ? '' : 'Publica una vacante activa primero.'"
        [(ngModel)]="vacancyId"
      />

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
              <div class="text-[12px] text-muted">
                IVA incluido@if (plan.validityDays) {
                  <span> · {{ plan.validityDays }} días</span>
                }
              </div>
            </button>
          } @empty {
            <p class="rounded-xl bg-surface px-4 py-5 text-center text-[13px] text-muted sm:col-span-2">
              Todavía no hay planes por publicación disponibles.
            </p>
          }
        </div>
      </div>

      <app-payment-choice
        [plan]="selectedPlan()"
        [options]="paymentOptions()"
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
        </div>
      }
    </div>

    <div class="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-line pt-4">
      <p class="mr-auto text-[12.5px] text-muted">
        {{
          isOnline()
            ? 'Te llevaremos a la página segura de Stripe.'
            : 'La promoción se activa cuando confirmemos el pago.'
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
export class PromotionForm implements OnInit {
  /** Vacantes activas de la empresa. */
  readonly vacancies = input.required<readonly IjOption[]>();
  readonly plans = input.required<readonly Plan[]>();
  readonly paymentOptions = input.required<readonly PaymentProviderOption[]>();
  /** Plan con el que abrir el formulario (p. ej. el elegido en `/planes`). */
  readonly initialPlanId = input<string | null>(null);
  readonly submitting = input(false);
  readonly error = input<string | null>(null);
  readonly save = output<PromotionRequest>();
  readonly cancel = output<void>();

  private readonly choice = viewChild(PaymentChoice);

  protected readonly vacancyId = signal('');
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
      Boolean(this.vacancyId()) &&
      Boolean(this.planId()) &&
      (this.choice()?.allowedMethods().includes(this.method()) ?? false),
  );

  ngOnInit(): void {
    const initial = this.initialPlanId();
    if (initial && this.plans().some((plan) => plan.id === initial)) {
      this.planId.set(initial);
    }
  }

  protected onSubmit(): void {
    if (!this.canSubmit()) return;
    this.save.emit({
      vacancyId: this.vacancyId(),
      planId: this.planId(),
      method: this.method(),
      provider: this.provider(),
    });
  }
}
