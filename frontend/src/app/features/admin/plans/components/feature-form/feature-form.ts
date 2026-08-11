import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  input,
  output,
} from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { IjButton, IjInput, IjOption, IjSelect, IjTextarea } from '@/shared/ui';
import {
  FEATURE_VALUE_TYPE_LABELS,
  FeatureValueType,
  PlanFeatureCatalogItem,
  SavePlanFeaturePayload,
} from '@/features/admin/plans/models/plans.models';

/** Mismo patrón que valida el backend para el código del beneficio. */
const CODE_PATTERN = /^[a-z0-9_]{2,60}$/;

/**
 * Alta y edición de un beneficio del catálogo. El backend hace *upsert* por
 * código, así que editar es guardar con el mismo código — y por eso el código
 * queda bloqueado al editar: cambiarlo crearía otro beneficio.
 */
@Component({
  selector: 'app-feature-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, IjButton, IjInput, IjSelect, IjTextarea],
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
          label="Nombre"
          placeholder="Acceso a base de talento"
          [required]="true"
          [error]="invalid('name') ? 'El nombre es obligatorio.' : null"
          formControlName="name"
        />
        <ij-input
          label="Código"
          placeholder="talent_db_access"
          [required]="true"
          hint="Minúsculas, números o guion bajo. La lógica de negocio se apoya en él."
          [error]="codeError()"
          formControlName="code"
        />
        <ij-select
          label="Tipo de valor"
          [required]="true"
          [options]="valueTypeOptions"
          [searchable]="false"
          hint="“Sí / No” sólo se marca; los demás piden un valor por plan."
          formControlName="valueType"
        />
        <ij-input
          label="Orden en la comparativa"
          type="number"
          placeholder="0"
          [min]="0"
          formControlName="sortOrder"
        />
        <ij-textarea
          class="sm:col-span-2"
          label="Descripción"
          placeholder="Qué obtiene la empresa con este beneficio."
          [rows]="2"
          [maxLength]="300"
          formControlName="description"
        />
      </div>

      <div class="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-line pt-4">
        <p class="mr-auto text-[12.5px] text-muted">
          Aparecerá en todos los planes como no incluido hasta que lo actives.
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
          {{ submitting() ? 'Guardando…' : feature() ? 'Guardar cambios' : 'Crear beneficio' }}
        </button>
      </div>
    </form>
  `,
})
export class FeatureForm implements OnInit {
  /** `null` en el alta; el beneficio a editar en caso contrario. */
  readonly feature = input<PlanFeatureCatalogItem | null>(null);
  readonly submitting = input(false);
  readonly error = input<string | null>(null);
  readonly save = output<SavePlanFeaturePayload>();
  readonly cancel = output<void>();

  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly valueTypeOptions: readonly IjOption[] = Object.values(
    FeatureValueType,
  ).map((value) => ({ value, label: FEATURE_VALUE_TYPE_LABELS[value] }));

  protected readonly form = this.fb.group({
    code: this.fb.control('', [
      Validators.required,
      Validators.pattern(CODE_PATTERN),
    ]),
    name: this.fb.control('', [Validators.required]),
    description: this.fb.control(''),
    valueType: this.fb.control<FeatureValueType>(FeatureValueType.BOOLEAN, [
      Validators.required,
    ]),
    sortOrder: this.fb.control<number | null>(null),
  });

  ngOnInit(): void {
    const feature = this.feature();
    if (!feature) return;

    this.form.setValue({
      code: feature.code,
      name: feature.name,
      description: feature.description ?? '',
      valueType: feature.valueType,
      sortOrder: feature.sortOrder,
    });
    this.form.controls.code.disable();
  }

  protected invalid(name: string): boolean {
    const control = this.form.get(name) as AbstractControl;
    return control.invalid && (control.dirty || control.touched);
  }

  protected codeError(): string | null {
    if (!this.invalid('code')) return null;
    return this.form.controls.code.hasError('pattern')
      ? 'Sólo minúsculas, números o guion bajo (2 a 60 caracteres).'
      : 'El código es obligatorio.';
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // `getRawValue` incluye el código aunque esté deshabilitado al editar.
    const value = this.form.getRawValue();
    const payload: SavePlanFeaturePayload = {
      code: value.code.trim().toLowerCase(),
      name: value.name.trim(),
      valueType: value.valueType,
      sortOrder: value.sortOrder === null ? 0 : Number(value.sortOrder),
    };

    const description = value.description.trim();
    if (description) payload.description = description;

    this.save.emit(payload);
  }
}
