import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  model,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IjIcon, IjOption, IjSelect } from '@/shared/ui';
import {
  PAYMENT_METHOD_LABELS,
  PaymentMethod,
  PaymentProvider,
  PaymentProviderOption,
  Plan,
} from '@/features/company/billing/models/billing.models';

interface ProviderCard {
  provider: PaymentProvider;
  title: string;
  description: string;
}

/**
 * "¿Cómo quieres pagar?": pagar en línea con Stripe o enviar una solicitud de
 * pago que confirma el equipo. Compartido por la compra de una promoción y la
 * de la suscripción.
 *
 * Los métodos que se ofrecen son la **intersección** de dos listas del
 * backend: lo que admite el importe del plan (`plan.paymentMethods`: OXXO
 * tiene tope, una suscripción no admite MSI) y lo que sabe cobrar el medio
 * elegido (`GET /payments/options`). Así el formulario nunca ofrece algo que
 * el backend fuera a rechazar.
 *
 * "Pagar en línea" sólo aparece si Stripe está configurado en el entorno.
 */
@Component({
  selector: 'app-payment-choice',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IjIcon, IjSelect],
  template: `
    <div>
      <span class="mb-2 block text-[13px] font-bold text-ink-900">¿Cómo quieres pagar?</span>
      <div class="grid gap-3 sm:grid-cols-2">
        @for (card of cards(); track card.provider) {
          <button
            type="button"
            class="flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-colors"
            [class]="
              provider() === card.provider
                ? 'border-brand bg-brand-50'
                : 'border-line bg-white hover:bg-surface'
            "
            [attr.aria-pressed]="provider() === card.provider"
            (click)="provider.set(card.provider)"
          >
            <span class="mt-0.5 flex-shrink-0 text-brand-strong">
              <ij-icon
                [name]="card.provider === stripe ? 'credit-card' : 'bank'"
                [size]="18"
              />
            </span>
            <span>
              <span class="block text-[14px] font-bold text-ink-900">{{ card.title }}</span>
              <span class="mt-0.5 block text-[12.5px] leading-snug text-muted">
                {{ card.description }}
              </span>
            </span>
          </button>
        }
      </div>
    </div>

    @if (methodOptions().length > 1) {
      <div class="mt-4">
        <ij-select
          label="Método de pago"
          name="method"
          [required]="true"
          [options]="methodOptions()"
          [searchable]="false"
          [hint]="methodHint()"
          [(ngModel)]="method"
        />
      </div>
    } @else if (methodOptions().length === 0) {
      <p class="mt-3 rounded-xl bg-amber-50 px-3.5 py-2.5 text-[12.5px] font-medium text-amber-800">
        Este medio no admite el importe del plan. Elige el otro.
      </p>
    }
  `,
})
export class PaymentChoice {
  readonly plan = input<Plan | undefined>(undefined);
  readonly options = input.required<readonly PaymentProviderOption[]>();
  /** `true` para la suscripción anual (cobro recurrente). */
  readonly recurring = input(false);

  readonly provider = model<PaymentProvider>(PaymentProvider.MANUAL);
  readonly method = model<PaymentMethod>(PaymentMethod.SPEI);

  protected readonly stripe = PaymentProvider.STRIPE;

  protected readonly cards = computed<ProviderCard[]>(() =>
    this.options().map((option) =>
      option.provider === PaymentProvider.STRIPE
        ? {
            provider: option.provider,
            title: 'Pagar en línea',
            description: this.recurring()
              ? 'Con tarjeta, en la página segura de Stripe. Se activa al momento y se renueva cada año.'
              : 'Tarjeta, meses sin intereses u OXXO, en la página segura de Stripe. Con tarjeta se activa al momento.',
          }
        : {
            provider: option.provider,
            title: 'Solicitar pago',
            description:
              'Te damos un folio, pagas por transferencia SPEI y nuestro equipo lo confirma.',
          },
    ),
  );

  /** Métodos del medio elegido que además admite el importe del plan. */
  readonly allowedMethods = computed<PaymentMethod[]>(() => {
    const option = this.options().find((o) => o.provider === this.provider());
    if (!option) return [];
    const byProvider = this.recurring() ? option.recurringMethods : option.methods;
    const plan = this.plan();
    if (!plan) return byProvider;
    const byAmount = new Set(
      plan.paymentMethods.filter((m) => m.available).map((m) => m.method),
    );
    return byProvider.filter((method) => byAmount.has(method));
  });

  protected readonly methodOptions = computed<readonly IjOption[]>(() =>
    this.allowedMethods().map((method) => ({
      value: method,
      label: PAYMENT_METHOD_LABELS[method] ?? method,
    })),
  );

  /** Por qué falta un método que el medio sí cobra (p. ej. el tope de OXXO). */
  protected readonly methodHint = computed(() => {
    const plan = this.plan();
    const option = this.options().find((o) => o.provider === this.provider());
    if (!plan || !option) return '';
    const byProvider = new Set(
      this.recurring() ? option.recurringMethods : option.methods,
    );
    return plan.paymentMethods
      .filter((m) => !m.available && byProvider.has(m.method))
      .map(
        (m) => `${PAYMENT_METHOD_LABELS[m.method] ?? m.method}: ${m.reason ?? 'no disponible'}`,
      )
      .join(' · ');
  });

  constructor() {
    // Pagar en línea es la opción por defecto cuando existe: es la que activa
    // al momento. Sólo se decide una vez, al llegar las opciones.
    effect(() => {
      const options = this.options();
      untracked(() => {
        const current = options.some((o) => o.provider === this.provider());
        if (current && this.provider() !== PaymentProvider.MANUAL) return;
        const stripe = options.find((o) => o.provider === PaymentProvider.STRIPE);
        const fallback = stripe ?? options[0];
        if (fallback) this.provider.set(fallback.provider);
      });
    });

    // Al cambiar de medio o de plan, el método se reajusta si ya no vale.
    effect(() => {
      const allowed = this.allowedMethods();
      untracked(() => {
        if (!allowed.includes(this.method()) && allowed[0]) {
          this.method.set(allowed[0]);
        }
      });
    });
  }
}
