import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
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

/** Lo que hace falta para promocionar una vacante y abrir el cobro. */
export interface PromotionRequest {
  vacancyId: string;
  planId: string;
  method: PaymentMethod;
  installments?: number;
}

/**
 * Compra de una promoción: vacante, plan y método de pago. Los métodos que se
 * ofrecen salen del propio plan (`paymentMethods`) — OXXO, por ejemplo, tiene
 * un tope de importe y el backend lo marca como no disponible.
 */
@Component({
  selector: 'app-promotion-form',
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

      <ij-select
        label="Método de pago"
        name="method"
        [required]="true"
        [options]="methodOptions()"
        [searchable]="false"
        [hint]="methodHint()"
        [(ngModel)]="method"
      />

      @if (method() === msi) {
        <ij-select
          label="Meses sin intereses"
          name="installments"
          [options]="installmentOptions"
          [searchable]="false"
          [(ngModel)]="installments"
        />
      }

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
        La promoción se activa cuando el pago se confirma.
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
export class PromotionForm {
  /** Vacantes activas de la empresa. */
  readonly vacancies = input.required<readonly IjOption[]>();
  readonly plans = input.required<readonly Plan[]>();
  readonly submitting = input(false);
  readonly error = input<string | null>(null);
  readonly save = output<PromotionRequest>();
  readonly cancel = output<void>();

  protected readonly msi = PaymentMethod.MSI;

  protected readonly vacancyId = signal('');
  protected readonly planId = signal('');
  protected readonly method = signal<PaymentMethod>(PaymentMethod.CARD);
  protected readonly installments = signal('3');

  protected readonly installmentOptions: readonly IjOption[] = [
    { value: '3', label: '3 meses' },
    { value: '6', label: '6 meses' },
    { value: '9', label: '9 meses' },
    { value: '12', label: '12 meses' },
  ];

  protected readonly selectedPlan = computed(() =>
    this.plans().find((plan) => plan.id === this.planId()),
  );

  /** Sólo los métodos que el backend acepta para el importe de este plan. */
  protected readonly methodOptions = computed<readonly IjOption[]>(() => {
    const plan = this.selectedPlan();
    if (!plan) {
      return Object.values(PaymentMethod).map((value) => ({
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
    const blocked = plan.paymentMethods.filter((item) => !item.available);
    if (blocked.length === 0) return '';
    return blocked
      .map(
        (item) =>
          `${PAYMENT_METHOD_LABELS[item.method] ?? item.method}: ${item.reason ?? 'no disponible'}`,
      )
      .join(' · ');
  });

  protected readonly canSubmit = computed(
    () => Boolean(this.vacancyId()) && Boolean(this.planId()),
  );

  protected onSubmit(): void {
    if (!this.canSubmit()) return;
    const method = this.method();
    this.save.emit({
      vacancyId: this.vacancyId(),
      planId: this.planId(),
      method,
      installments:
        method === PaymentMethod.MSI ? Number(this.installments()) : undefined,
    });
  }
}
