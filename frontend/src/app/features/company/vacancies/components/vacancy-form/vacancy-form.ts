import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  OnInit,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MX_STATES } from '@/shared/catalogs/mx.catalogs';
import { PROFESSIONAL_AREAS } from '@/shared/catalogs/professional-areas.catalogs';
import { piiWarning } from '@/shared/utils/pii';
import {
  IjButton,
  IjDatepicker,
  IjIcon,
  IjInput,
  IjOption,
  IjSelect,
  IjTextarea,
} from '@/shared/ui';
import {
  CONTRACT_TYPE_LABELS,
  ContractType,
  EDUCATION_LEVEL_LABELS,
  EducationLevel,
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
  imports: [
    ReactiveFormsModule,
    IjButton,
    IjDatepicker,
    IjIcon,
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
        <ij-select
          label="Área profesional"
          [required]="true"
          [options]="areas"
          [error]="invalid('professionalAreaId') ? 'Selecciona el área.' : null"
          formControlName="professionalAreaId"
        />

        <ij-select
          label="Tipo de contrato"
          [required]="true"
          [options]="contractTypes"
          [searchable]="false"
          formControlName="contractType"
        />
        <ij-select
          label="Escolaridad mínima"
          [options]="educationLevels"
          [searchable]="false"
          formControlName="minEducationLevel"
        />

        <ij-input
          label="Número de plazas"
          type="number"
          [min]="1"
          hint="Cuántas posiciones cubre esta vacante."
          formControlName="positionsCount"
        />
        <ij-datepicker
          label="Fecha límite para postularse"
          hint="Opcional. La vacante deja de recibir postulaciones al día siguiente."
          [min]="today"
          formControlName="applicationDeadline"
        />

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
          formControlName="hasCommissions"
        />
        El puesto paga comisiones además del salario base
      </label>

      <label class="mt-2 flex items-center gap-2.5 text-[13.5px] text-body">
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

      <div class="mt-5 border-t border-line pt-5">
        <p class="mb-2 text-[13.5px] font-bold text-ink-900">Imagen de referencia</p>
        <p class="mb-3 text-[12.5px] text-muted">
          Opcional. JPG, PNG o WebP, máximo 5 MB. Se mostrará como cabecera en el detalle de la vacante.
        </p>
        <div class="flex items-start gap-4">
          @if (imagePreview()) {
            <div class="relative h-32 w-48 flex-shrink-0 overflow-hidden rounded-xl border border-line">
              <img [src]="imagePreview()" alt="Vista previa" class="h-full w-full object-cover" />
              <button
                type="button"
                class="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-ink-950/60 text-white transition-colors hover:bg-ink-950/80"
                (click)="removeImage()"
              >
                <ij-icon name="x" [size]="14" />
              </button>
            </div>
          } @else {
            <label
              class="flex h-32 w-48 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-line text-center transition-colors hover:border-brand hover:bg-brand-50/30"
            >
              <ij-icon name="image" [size]="24" class="text-muted" />
              <span class="text-[12px] font-semibold text-muted">Subir imagen</span>
              <span class="text-[11px] text-muted">JPG, PNG, WebP</span>
              <input
                #fileInput
                type="file"
                accept="image/jpeg,image/png,image/webp"
                class="hidden"
                (change)="onImageSelected($event)"
              />
            </label>
          }
        </div>
        @if (imageError()) {
          <p class="mt-2 text-[12.5px] font-medium text-red-600">{{ imageError() }}</p>
        }
      </div>

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
  /** Emite el archivo de imagen seleccionado para que el padre lo suba. */
  readonly imageSelected = output<File | null>();
  /** Emite cuando se quita la imagen existente (edición). */
  readonly imageRemoved = output<void>();

  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  protected readonly employmentTypes = options(EMPLOYMENT_TYPE_LABELS);
  protected readonly workModes = options(WORK_MODE_LABELS);
  protected readonly experienceLevels = options(EXPERIENCE_LEVEL_LABELS);
  protected readonly contractTypes = options(CONTRACT_TYPE_LABELS);
  protected readonly educationLevels: IjOption[] = [
    { value: '', label: 'Sin requisito' },
    ...options(EDUCATION_LEVEL_LABELS),
  ];
  protected readonly states: IjOption[] = MX_STATES.map((s) => ({
    value: s.code,
    label: s.name,
  }));
  protected readonly areas: IjOption[] = PROFESSIONAL_AREAS.map((a) => ({
    value: String(a.id),
    label: a.name,
  }));
  /** Hoy en ISO local: la fecha límite no puede nacer en el pasado. */
  protected readonly today = new Date().toISOString().slice(0, 10);

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
    professionalAreaId: this.fb.control('', [Validators.required]),
    contractType: this.fb.control<ContractType>(ContractType.INDEFINITE, [
      Validators.required,
    ]),
    minEducationLevel: this.fb.control(''),
    positionsCount: this.fb.control<number | null>(1),
    applicationDeadline: this.fb.control(''),
    hasCommissions: this.fb.control(false),
    salaryMin: this.fb.control<number | null>(null),
    salaryMax: this.fb.control<number | null>(null),
    salaryHidden: this.fb.control(false),
    isConfidential: this.fb.control(false),
  });

  private readonly destroyRef = inject(DestroyRef);
  protected readonly piiNotice = signal<string | null>(null);
  protected readonly imagePreview = signal<string | null>(null);
  protected readonly imageError = signal<string | null>(null);
  private selectedImageFile: File | null = null;

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
      professionalAreaId:
        vacancy.professionalAreaId === null
          ? ''
          : String(vacancy.professionalAreaId),
      contractType: vacancy.contractType ?? ContractType.INDEFINITE,
      minEducationLevel: vacancy.minEducationLevel ?? '',
      positionsCount: vacancy.positionsCount,
      applicationDeadline: vacancy.applicationDeadline ?? '',
      hasCommissions: vacancy.hasCommissions,
      salaryMin: vacancy.salaryMin,
      salaryMax: vacancy.salaryMax,
      salaryHidden: vacancy.salaryHidden,
      isConfidential: vacancy.isConfidential,
    });

    if (vacancy.imageUrl) {
      this.imagePreview.set(vacancy.imageUrl);
    }
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

  protected onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.imageError.set(null);
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      this.imageError.set('La imagen no puede superar los 5 MB.');
      input.value = '';
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      this.imageError.set('El archivo no es una imagen válida (JPG, PNG o WebP).');
      input.value = '';
      return;
    }

    this.selectedImageFile = file;
    const reader = new FileReader();
    reader.onload = () => this.imagePreview.set(reader.result as string);
    reader.readAsDataURL(file);
    this.imageSelected.emit(file);
  }

  protected removeImage(): void {
    const hadExistingImage = !!this.vacancy()?.imageUrl && !this.selectedImageFile;
    this.selectedImageFile = null;
    this.imagePreview.set(null);
    this.imageError.set(null);
    this.imageSelected.emit(null);
    if (hadExistingImage) {
      this.imageRemoved.emit();
    }
    this.fileInput()?.nativeElement?.setAttribute('value', '');
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
      professionalAreaId: Number(value.professionalAreaId),
      contractType: value.contractType,
      positionsCount: Math.max(1, Number(value.positionsCount) || 1),
      hasCommissions: value.hasCommissions,
      salaryHidden: value.salaryHidden,
    };
    if (value.minEducationLevel) {
      payload.minEducationLevel = value.minEducationLevel as EducationLevel;
    }
    if (value.applicationDeadline) {
      payload.applicationDeadline = value.applicationDeadline;
    }
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
