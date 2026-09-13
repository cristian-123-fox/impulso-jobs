import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { LocaleFormatService } from '@/core/i18n/locale-format.service';
import {
  IjButton,
  IjDatepicker,
  IjInput,
  IjOption,
  IjSelect,
  IjTextarea,
} from '@/shared/ui';
import {
  PLAN_TYPE_LABELS,
  PaymentMethod,
  PAYMENT_METHOD_LABELS,
  Plan,
  PlanType,
} from '@/features/admin/plans/models/plans.models';
import {
  AdminCompanySubscription,
  AssignSubscriptionPayload,
} from '@/features/admin/companies/models/companies.models';

/** IVA mexicano. El backend manda, esto es sólo la vista previa del desglose. */
const TAX_RATE = 0.16;

/** Métodos con los que tiene sentido registrar una venta ya cerrada. */
const OFFLINE_METHODS = [PaymentMethod.SPEI, PaymentMethod.CARD];

/**
 * Asignación o cambio del plan de una empresa (T34).
 *
 * El selector muestra **todo el catálogo**, activo o no: un cliente antiguo
 * puede conservar un plan ya retirado del escaparate. Un plan por publicación
 * también se puede elegir, pero se avisa de lo que implica — la empresa recibe
 * el cupo de talento del plan durante el periodo y ninguna vacante queda
 * destacada, porque los distintivos los dan las promociones, no la suscripción.
 */
@Component({
  selector: 'app-company-subscription-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    IjButton,
    IjDatepicker,
    IjInput,
    IjSelect,
    IjTextarea,
  ],
  template: `
    <form novalidate [formGroup]="form" (ngSubmit)="onSubmit()">
      @if (error()) {
        <p
          role="alert"
          class="mb-4 rounded-lg bg-red-50 px-3 py-2 text-[13px] font-medium text-red-700"
        >
          {{ error() }}
        </p>
      }

      @if (current(); as active) {
        <p
          class="mb-4 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[13px] text-body"
        >
          Esta empresa ya tiene el plan
          <span class="font-bold text-ink-900">{{ active.planName }}</span
          >. Al guardar se cierra y su cupo de la base de talento deja de contar
          hoy; el del plan nuevo se otorga en el acto.
        </p>
      }

      <ij-select
        label="Plan"
        placeholder="Elige un plan del catálogo"
        [required]="true"
        [options]="planOptions()"
        formControlName="planId"
      />

      @if (selectedPlan(); as plan) {
        @if (plan.planType === perPublication) {
          <p
            class="mt-2 rounded-xl bg-accent-amber-soft px-3.5 py-2.5 text-[12.5px] text-accent-amber-strong"
          >
            <span class="font-bold">Ojo:</span> {{ plan.name }} es un plan por
            publicación. Asignado como suscripción, la empresa recibe su cupo de
            la base de talento durante el periodo, pero
            <span class="font-bold">ninguna vacante queda destacada</span> — los
            distintivos los da promocionar una vacante, no el plan de empresa.
          </p>
        }
        @if (!plan.isActive) {
          <p class="mt-2 text-[12.5px] text-muted">
            Este plan está retirado del escaparate: no aparece en la página de
            planes, pero puede asignarse a un cliente que ya lo tenía.
          </p>
        }
      }

      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        <ij-datepicker
          label="Vigente hasta"
          [min]="minDate"
          hint="Por defecto, un año desde hoy."
          formControlName="currentPeriodEnd"
        />
        <ij-select
          label="Cómo se cobró"
          [options]="methodOptions"
          [searchable]="false"
          formControlName="method"
        />
      </div>

      <div class="mt-4">
        <ij-input
          label="Importe sin IVA"
          type="number"
          [min]="0"
          hint="Se propone el precio del plan. Cámbialo si hubo descuento."
          formControlName="amount"
        />
        <p class="mt-1.5 text-[12.5px] text-muted">
          IVA {{ taxLabel() }} · Total a registrar
          <span class="font-bold text-ink-900">{{ totalLabel() }}</span>
        </p>
      </div>

      <div class="mt-4">
        <ij-textarea
          label="Motivo"
          [required]="true"
          [rows]="2"
          [maxLength]="500"
          hint="Queda en auditoría: quién asignó qué plan, a quién y por qué."
          formControlName="reason"
        />
      </div>

      <label class="mt-4 flex cursor-pointer items-start gap-2.5">
        <input
          type="checkbox"
          class="mt-0.5 h-4 w-4 accent-brand"
          formControlName="autoRenew"
        />
        <span class="text-[13px] text-body">
          Renovar automáticamente al vencer
        </span>
      </label>

      <div class="mt-6 flex justify-end gap-3 border-t border-line pt-4">
        <button
          type="button"
          class="rounded-xl border border-line bg-white px-4 py-2.5 text-[13.5px] font-bold text-body transition-colors hover:bg-surface"
          (click)="cancel.emit()"
        >
          Cancelar
        </button>
        <button
          ij-button
          type="submit"
          variant="primary"
          shape="rounded"
          size="md"
          [disabled]="submitting() || form.invalid"
        >
          {{ submitLabel() }}
        </button>
      </div>
    </form>
  `,
})
export class CompanySubscriptionForm implements OnInit {
  /** Catálogo completo (`GET /admin/plans`), activos e inactivos. */
  readonly plans = input.required<readonly Plan[]>();
  /** Plan vigente, si lo hay: cambia el texto y avisa del recálculo de cupo. */
  readonly current = input<AdminCompanySubscription | null>(null);
  readonly submitting = input(false);
  readonly error = input<string | null>(null);
  readonly save = output<AssignSubscriptionPayload>();
  readonly cancel = output<void>();

  private readonly fb = inject(NonNullableFormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly format = inject(LocaleFormatService);

  protected readonly perPublication = PlanType.PER_PUBLICATION;
  protected readonly minDate = isoDate(tomorrow());

  protected readonly methodOptions: readonly IjOption[] = OFFLINE_METHODS.map(
    (method) => ({ value: method, label: PAYMENT_METHOD_LABELS[method] }),
  );

  protected readonly form = this.fb.group({
    planId: this.fb.control('', [Validators.required]),
    currentPeriodEnd: this.fb.control(''),
    method: this.fb.control<string>(PaymentMethod.SPEI),
    // `ij-input` es un ControlValueAccessor de **texto**: aunque el type sea
    // number, lo que llega aquí es string (y '' al vaciarlo). De ahí
    // `numberOrNull` en vez de confiar en el tipo del control.
    amount: this.fb.control<string>(''),
    reason: this.fb.control('', [
      Validators.required,
      Validators.minLength(5),
      Validators.maxLength(500),
    ]),
    autoRenew: this.fb.control(true),
  });

  private readonly planId = signal('');
  private readonly amount = signal<number | null>(null);

  protected readonly planOptions = computed<readonly IjOption[]>(() =>
    this.plans().map((plan) => ({
      value: plan.id,
      label: plan.isActive
        ? `${plan.name} · ${PLAN_TYPE_LABELS[plan.planType]}`
        : `${plan.name} · ${PLAN_TYPE_LABELS[plan.planType]} (retirado)`,
    })),
  );

  protected readonly selectedPlan = computed<Plan | null>(
    () => this.plans().find((plan) => plan.id === this.planId()) ?? null,
  );

  /** Subtotal efectivo: lo que teclee el admin, o el precio del plan. */
  private readonly subtotal = computed(
    () => this.amount() ?? this.selectedPlan()?.price.subtotal ?? 0,
  );

  protected readonly taxLabel = computed(() =>
    this.format.currency(round2(this.subtotal() * TAX_RATE), 2),
  );

  protected readonly totalLabel = computed(() =>
    this.format.currency(round2(this.subtotal() * (1 + TAX_RATE)), 2),
  );

  protected readonly submitLabel = computed(() => {
    if (this.submitting()) return 'Guardando…';
    return this.current() ? 'Cambiar plan' : 'Asignar plan';
  });

  constructor() {
    this.form.controls.planId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((id) => {
        this.planId.set(id);
        // Al elegir plan se propone su precio, pero sin pisar lo ya tecleado.
        if (this.amount() === null) {
          const subtotal = this.selectedPlan()?.price.subtotal;
          this.form.controls.amount.setValue(
            subtotal === undefined ? '' : String(subtotal),
            { emitEvent: false },
          );
          this.amount.set(subtotal ?? null);
        }
      });

    this.form.controls.amount.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.amount.set(numberOrNull(value)));
  }

  ngOnInit(): void {
    const active = this.current();
    if (active) this.form.controls.planId.setValue(active.planId);
  }

  protected onSubmit(): void {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();

    this.save.emit({
      planId: raw.planId,
      reason: raw.reason.trim(),
      // El datepicker da 'YYYY-MM-DD'; el backend espera ISO completo, y sin
      // hora una fecha límite se corre un día hacia atrás en México.
      currentPeriodEnd: raw.currentPeriodEnd
        ? `${raw.currentPeriodEnd}T23:59:59.000Z`
        : undefined,
      // Vaciar el campo no es cobrar 0: se omite y el backend usa el precio
      // del plan. `?? undefined` sobre '' enviaría 0.
      amount: numberOrNull(raw.amount) ?? undefined,
      method: raw.method,
      autoRenew: raw.autoRenew,
    });
  }
}

/** El input numérico entrega `''` cuando se vacía: eso no es un 0. */
function numberOrNull(value: number | string | null): number | null {
  if (value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function tomorrow(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
