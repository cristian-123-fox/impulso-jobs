import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  OnInit,
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
import { MX_STATES } from '@/shared/catalogs/mx.catalogs';
import { piiWarning } from '@/shared/utils/pii';
import {
  IjButton,
  IjInput,
  IjOption,
  IjSelect,
  IjTextarea,
} from '@/shared/ui';
import {
  EMPLOYMENT_TYPE_LABELS,
  EmploymentType,
  EXPERIENCE_LEVEL_LABELS,
  ExperienceLevel,
  SaveVacancyPayload,
  Vacancy,
  WORK_MODE_LABELS,
  WorkMode,
} from '@/features/company/vacancies/models/vacancies.models';

function options<T extends string>(labels: Record<T, string>): IjOption[] {
  return (Object.keys(labels) as T[]).map((value) => ({
    value,
    label: labels[value],
  }));
}

/**
 * Alta y edición de vacante. No incluye los distintivos (destacada, urgente,
 * confidencial): los otorga la promoción contratada, no este formulario.
 */
@Component({
  selector: 'app-vacancy-form',
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
        <div class="sm:col-span-2">
          <ij-input
            label="Título de la vacante"
            placeholder="Desarrollador Frontend Sr."
            [required]="true"
            [error]="invalid('title') ? 'El título es obligatorio.' : null"
            formControlName="title"
          />
        </div>

        <ij-select
          label="Tipo de contratación"
          [required]="true"
          [options]="employmentTypes"
          [searchable]="false"
          formControlName="employmentType"
        />
        <ij-select
          label="Modalidad"
          [required]="true"
          [options]="workModes"
          [searchable]="false"
          formControlName="workMode"
        />
        <ij-select
          label="Estado"
          [required]="true"
          [options]="states"
          [error]="invalid('state') ? 'Selecciona el estado.' : null"
          formControlName="state"
        />
        <ij-input
          label="Municipio"
          placeholder="Zapopan"
          [required]="true"
          [error]="invalid('municipality') ? 'El municipio es obligatorio.' : null"
          formControlName="municipality"
        />
        <ij-select
          label="Experiencia requerida"
          [required]="true"
          [options]="experienceLevels"
          [searchable]="false"
          formControlName="experienceLevel"
        />
        <div></div>

        <ij-input
          label="Salario mensual mínimo (MXN)"
          type="number"
          placeholder="45000"
          [min]="0"
          hint="Opcional. Déjalo vacío si es a convenir."
          formControlName="salaryMin"
        />
        <ij-input
          label="Salario mensual máximo (MXN)"
          type="number"
          placeholder="65000"
          [min]="0"
          [error]="salaryRangeInvalid() ? 'El mínimo no puede superar al máximo.' : null"
          formControlName="salaryMax"
        />

        <div class="sm:col-span-2">
          <ij-textarea
            label="Descripción"
            [rows]="5"
            placeholder="Describe el puesto, el equipo y las responsabilidades."
            [required]="true"
            [error]="invalid('description') ? 'La descripción es obligatoria.' : null"
            formControlName="description"
          />
        </div>
        <div class="sm:col-span-2">
          <ij-textarea
            label="Requisitos (opcional)"
            [rows]="4"
            placeholder="Estudios, años de experiencia, herramientas…"
            formControlName="requirements"
          />
        </div>
      </div>

      @if (piiNotice(); as notice) {
        <p
          class="mt-3 rounded-lg bg-accent-amber-soft px-3 py-2 text-[13px] font-medium text-accent-amber"
        >
          {{ notice }}
        </p>
      }

      <label class="mt-4 flex items-center gap-2.5 text-[13.5px] text-body">
        <input
          type="checkbox"
          class="h-4 w-4 rounded border-line text-brand focus:ring-brand"
          formControlName="salaryHidden"
        />
        No mostrar el salario en el portal
      </label>

      @if (vacancy()?.canBeConfidential) {
        <label class="mt-2 flex items-center gap-2.5 text-[13.5px] text-body">
          <input
            type="checkbox"
            class="h-4 w-4 rounded border-line text-brand focus:ring-brand"
            formControlName="isConfidential"
          />
          Vacante confidencial (oculta el nombre de la empresa en el portal)
        </label>
      }

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
          [disabled]="submitting()"
        >
          {{ submitting() ? 'Guardando…' : saveLabel() }}
        </button>
      </div>
    </form>
  `,
})
export class VacancyForm implements OnInit {
  /** Vacante a editar; ausente en el alta. */
  readonly vacancy = input<Vacancy | null>(null);
  readonly submitting = input(false);
  readonly error = input<string | null>(null);
  readonly save = output<SaveVacancyPayload>();
  readonly cancel = output<void>();

  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly employmentTypes = options(EMPLOYMENT_TYPE_LABELS);
  protected readonly workModes = options(WORK_MODE_LABELS);
  protected readonly experienceLevels = options(EXPERIENCE_LEVEL_LABELS);
  protected readonly states: IjOption[] = MX_STATES.map((s) => ({
    value: s.code,
    label: s.name,
  }));

  protected readonly form = this.fb.group({
    title: this.fb.control('', [Validators.required, Validators.maxLength(160)]),
    description: this.fb.control('', [Validators.required]),
    requirements: this.fb.control(''),
    employmentType: this.fb.control<EmploymentType>(EmploymentType.FULL_TIME, [
      Validators.required,
    ]),
    workMode: this.fb.control<WorkMode>(WorkMode.ONSITE, [Validators.required]),
    state: this.fb.control('', [Validators.required]),
    municipality: this.fb.control('', [Validators.required]),
    experienceLevel: this.fb.control<ExperienceLevel>(ExperienceLevel.MID, [
      Validators.required,
    ]),
    salaryMin: this.fb.control<number | null>(null),
    salaryMax: this.fb.control<number | null>(null),
    salaryHidden: this.fb.control(false),
    isConfidential: this.fb.control(false),
  });

  private readonly destroyRef = inject(DestroyRef);
  protected readonly piiNotice = signal<string | null>(null);

  constructor() {
    // Aviso (no bloqueo) si la descripción trae teléfono/correo/enlace.
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const { description, requirements } = this.form.getRawValue();
        this.piiNotice.set(piiWarning(`${description}\n${requirements}`));
      });
  }

  ngOnInit(): void {
    const vacancy = this.vacancy();
    if (!vacancy) return;

    this.form.patchValue({
      title: vacancy.title,
      description: vacancy.description,
      requirements: vacancy.requirements ?? '',
      employmentType: vacancy.employmentType,
      workMode: vacancy.workMode,
      state: vacancy.state,
      municipality: vacancy.municipality,
      experienceLevel: vacancy.experienceLevel,
      salaryMin: vacancy.salaryMin,
      salaryMax: vacancy.salaryMax,
      salaryHidden: vacancy.salaryHidden,
      isConfidential: vacancy.isConfidential,
    });
  }

  protected saveLabel(): string {
    return this.vacancy() ? 'Guardar cambios' : 'Publicar vacante';
  }

  /** Mismo criterio que el backend, para avisar antes de enviar. */
  protected salaryRangeInvalid(): boolean {
    const { salaryMin, salaryMax } = this.form.getRawValue();
    return salaryMin !== null && salaryMax !== null && salaryMin > salaryMax;
  }

  protected invalid(name: string): boolean {
    const control = this.form.get(name) as AbstractControl;
    return control.invalid && (control.dirty || control.touched);
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.salaryRangeInvalid()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const payload: SaveVacancyPayload = {
      title: value.title.trim(),
      description: value.description.trim(),
      employmentType: value.employmentType,
      workMode: value.workMode,
      state: value.state,
      municipality: value.municipality.trim(),
      experienceLevel: value.experienceLevel,
      salaryHidden: value.salaryHidden,
    };
    if (value.requirements.trim()) {
      payload.requirements = value.requirements.trim();
    }
    if (value.salaryMin !== null) payload.salaryMin = Number(value.salaryMin);
    if (value.salaryMax !== null) payload.salaryMax = Number(value.salaryMax);
    // La confidencialidad sólo viaja si el plan otorgó la capacidad.
    if (this.vacancy()?.canBeConfidential) {
      payload.isConfidential = value.isConfidential;
    }

    this.save.emit(payload);
  }
}
