import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { IjButton, IjInput, IjOption, IjSelect, IjTextarea } from '@/shared/ui';
import {
  BILLING_PERIOD_LABELS,
  BillingPeriod,
  PLAN_TYPE_LABELS,
  Plan,
  PlanType,
  SavePlanPayload,
} from '@/features/admin/plans/models/plans.models';

/** Mismo IVA que aplica el backend; aquí sólo sirve para la vista previa. */
const TAX_RATE = 0.16;

/** El código sigue el mismo patrón que valida el backend. */
const CODE_PATTERN = /^[A-Z0-9_]{2,40}$/;

/**
 * Alta y edición de un plan. Los precios en MXN son una decisión de negocio y
 * se capturan **sin IVA**: el desglose que se muestra debajo replica el que
 * calcula el backend para la tarjeta de precios pública.
 *
 * El bloque final depende de la modalidad: un plan por publicación necesita
 * días de vigencia; uno de suscripción, el cupo de publicaciones incluidas.
 */
@Component({
  selector: 'app-plan-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    CurrencyPipe,
    IjButton,
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

      <div class="grid gap-4 sm:grid-cols-2">
        <ij-input
          label="Nombre del plan"
          placeholder="Publicación Destacada"
          [required]="true"
          [error]="invalid('name') ? 'El nombre es obligatorio.' : null"
          formControlName="name"
        />
        <ij-input
          label="Código"
          placeholder="ALTA"
          [required]="true"
          hint="Mayúsculas, números o guion bajo. Identifica al plan en la facturación."
          [error]="codeError()"
          formControlName="code"
        />
        <ij-textarea
          class="sm:col-span-2"
          label="Descripción"
          placeholder="Qué incluye el plan, en una línea para la tarjeta de precios."
          [rows]="2"
          [maxLength]="300"
          formControlName="description"
        />
        <ij-select
          label="Modalidad"
          [required]="true"
          [options]="planTypeOptions"
          [searchable]="false"
          formControlName="planType"
        />
        <ij-select
          label="Periodo de cobro"
          [required]="true"
          [options]="billingPeriodOptions"
          [searchable]="false"
          formControlName="billingPeriod"
        />
        <ij-input
          label="Precio sin IVA (MXN)"
          type="number"
          placeholder="1500"
          [required]="true"
          [min]="0"
          [error]="invalid('basePrice') ? 'Captura un precio válido.' : null"
          formControlName="basePrice"
        />
        <ij-input
          label="Orden en el listado"
          type="number"
          placeholder="0"
          [min]="0"
          hint="Menor primero, tanto aquí como en el portal."
          formControlName="sortOrder"
        />

        @if (isPerPublication()) {
          <ij-input
            label="Días de publicación"
            type="number"
            placeholder="30"
            [required]="true"
            [min]="1"
            [max]="365"
            hint="Cuánto dura la promoción de la vacante."
            [error]="invalid('validityDays') ? 'Entre 1 y 365 días.' : null"
            formControlName="validityDays"
          />
        } @else {
          <ij-input
            label="Publicaciones incluidas"
            type="number"
            placeholder="10"
            [min]="0"
            hint="0 = ilimitadas durante la vigencia de la suscripción."
            [error]="invalid('postingQuota') ? 'Captura un cupo válido.' : null"
            formControlName="postingQuota"
          />
        }
      </div>

      <div class="mt-5 rounded-xl bg-surface px-4 py-3.5">
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <span class="text-[12.5px] font-semibold text-muted">
            Así se cobrará: {{ preview().subtotal | currency: 'MXN' : 'symbol-narrow' : '1.2-2' }}
            + {{ preview().tax | currency: 'MXN' : 'symbol-narrow' : '1.2-2' }} de IVA
          </span>
          <span class="text-lg font-extrabold text-ink-900">
            {{ preview().total | currency: 'MXN' : 'symbol-narrow' : '1.2-2' }}
          </span>
        </div>
      </div>

      <div class="mt-4 flex flex-wrap gap-x-6 gap-y-2.5">
        <label class="flex items-center gap-2.5 text-[13.5px] text-body">
          <input
            type="checkbox"
            class="h-4 w-4 rounded border-line text-brand focus:ring-brand"
            formControlName="isPopular"
          />
          Destacar como “Más popular”
        </label>
        <label class="flex items-center gap-2.5 text-[13.5px] text-body">
          <input
            type="checkbox"
            class="h-4 w-4 rounded border-line text-brand focus:ring-brand"
            formControlName="isActive"
          />
          Publicar en el portal
        </label>
      </div>

      <div class="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-line pt-4">
        <p class="mr-auto text-[12.5px] text-muted">
          Los beneficios del plan se editan por separado.
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
          type="submit"
          variant="primary"
          shape="rounded"
          size="md"
          [disabled]="submitting()"
        >
          {{ submitting() ? 'Guardando…' : plan() ? 'Guardar cambios' : 'Crear plan' }}
        </button>
      </div>
    </form>
  `,
})
export class PlanForm implements OnInit {
  /** `null` en el alta; el plan a editar en caso contrario. */
  readonly plan = input<Plan | null>(null);
  readonly submitting = input(false);
  readonly error = input<string | null>(null);
  readonly save = output<SavePlanPayload>();
  readonly cancel = output<void>();

  private readonly fb = inject(NonNullableFormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly planTypeOptions: readonly IjOption[] = Object.values(
    PlanType,
  ).map((value) => ({ value, label: PLAN_TYPE_LABELS[value] }));

  protected readonly billingPeriodOptions: readonly IjOption[] = Object.values(
    BillingPeriod,
  ).map((value) => ({ value, label: BILLING_PERIOD_LABELS[value] }));

  protected readonly form = this.fb.group({
    code: this.fb.control('', [
      Validators.required,
      Validators.pattern(CODE_PATTERN),
    ]),
    name: this.fb.control('', [Validators.required]),
    description: this.fb.control(''),
    planType: this.fb.control<PlanType>(PlanType.PER_PUBLICATION, [
      Validators.required,
    ]),
    billingPeriod: this.fb.control<BillingPeriod>(BillingPeriod.ONE_TIME, [
      Validators.required,
    ]),
    basePrice: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(0),
    ]),
    validityDays: this.fb.control<number | null>(null),
    postingQuota: this.fb.control<number | null>(null),
    sortOrder: this.fb.control<number | null>(null),
    isPopular: this.fb.control(false),
    isActive: this.fb.control(false),
  });

  /** Se refleja en la plantilla: el bloque final cambia con la modalidad. */
  protected readonly planTypeValue = signal<PlanType>(PlanType.PER_PUBLICATION);
  protected readonly isPerPublication = computed(
    () => this.planTypeValue() === PlanType.PER_PUBLICATION,
  );

  private readonly basePriceValue = signal<number | null>(null);
  protected readonly preview = computed(() => {
    const subtotal = Math.max(this.basePriceValue() ?? 0, 0);
    const tax = round2(subtotal * TAX_RATE);
    return { subtotal, tax, total: round2(subtotal + tax) };
  });

  constructor() {
    this.form.controls.planType.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((planType) => {
        this.planTypeValue.set(planType);
        this.syncTypeValidators(planType);
        // El periodo lo determina la modalidad: no hay combinaciones válidas
        // fuera de estas dos, así que se ajusta solo.
        this.form.controls.billingPeriod.setValue(
          planType === PlanType.PER_PUBLICATION
            ? BillingPeriod.ONE_TIME
            : BillingPeriod.ANNUAL,
        );
      });

    this.form.controls.basePrice.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.basePriceValue.set(numberOrNull(value)));
  }

  /** Los inputs aún no están asignados en el constructor: se lee aquí. */
  ngOnInit(): void {
    const plan = this.plan();
    if (!plan) {
      this.syncTypeValidators(this.form.controls.planType.value);
      return;
    }

    this.form.setValue({
      code: plan.code,
      name: plan.name,
      description: plan.description ?? '',
      planType: plan.planType,
      billingPeriod: plan.billingPeriod,
      basePrice: plan.price.subtotal,
      validityDays: plan.validityDays,
      postingQuota: plan.postingQuota,
      sortOrder: plan.sortOrder,
      isPopular: plan.isPopular,
      isActive: plan.isActive,
    });
    this.planTypeValue.set(plan.planType);
    this.basePriceValue.set(plan.price.subtotal);
    this.syncTypeValidators(plan.planType);
  }

  /**
   * El backend rechaza un plan por publicación sin días de vigencia; se valida
   * aquí también para no gastar un viaje.
   */
  private syncTypeValidators(planType: PlanType): void {
    const perPublication = planType === PlanType.PER_PUBLICATION;
    const validityDays = this.form.controls.validityDays;
    const postingQuota = this.form.controls.postingQuota;

    validityDays.setValidators(
      perPublication
        ? [Validators.required, Validators.min(1), Validators.max(365)]
        : [],
    );
    postingQuota.setValidators(perPublication ? [] : [Validators.min(0)]);
    validityDays.updateValueAndValidity({ emitEvent: false });
    postingQuota.updateValueAndValidity({ emitEvent: false });
  }

  protected invalid(name: string): boolean {
    const control = this.form.get(name) as AbstractControl;
    return control.invalid && (control.dirty || control.touched);
  }

  protected codeError(): string | null {
    const control = this.form.controls.code;
    if (!this.invalid('code')) return null;
    return control.hasError('pattern')
      ? 'Sólo mayúsculas, números o guion bajo (2 a 40 caracteres).'
      : 'El código es obligatorio.';
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const perPublication = value.planType === PlanType.PER_PUBLICATION;
    const payload: SavePlanPayload = {
      code: value.code.trim().toUpperCase(),
      name: value.name.trim(),
      planType: value.planType,
      billingPeriod: value.billingPeriod,
      basePrice: numberOrNull(value.basePrice) ?? 0,
      isPopular: value.isPopular,
      isActive: value.isActive,
      sortOrder: numberOrNull(value.sortOrder) ?? 0,
    };

    const description = value.description.trim();
    if (description) payload.description = description;

    // Se envía sólo el campo de la modalidad elegida: el otro queda en null y
    // el backend lo interpreta como "no aplica".
    if (perPublication) {
      payload.validityDays = numberOrNull(value.validityDays) ?? undefined;
    } else {
      const quota = numberOrNull(value.postingQuota);
      if (quota !== null) payload.postingQuota = quota;
    }

    this.save.emit(payload);
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
