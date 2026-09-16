import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MX_STATES } from '@/shared/catalogs/mx.catalogs';
import { PROFESSIONAL_AREAS } from '@/shared/catalogs/professional-areas.catalogs';
import {
  IjButton,
  IjDatepicker,
  IjEditor,
  IjIcon,
  IjInput,
  IjOption,
  IjSelect,
} from '@/shared/ui';
import { piiWarning } from '@/shared/utils/pii';
import { VacanciesApi } from '@/features/company/vacancies/data/vacancies.api';
import { VacancySkillsInput } from '@/features/company/vacancies/components/vacancy-skills-input/vacancy-skills-input';
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
  SaveVacancySkill,
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

/** Campos que validan cada paso. El paso 4 no tiene obligatorios. */
const STEP_CONTROLS: readonly (readonly string[])[] = [
  ['title', 'professionalAreaId', 'employmentType', 'contractType', 'workMode', 'state', 'municipality'],
  ['description'],
  ['salaryMin', 'salaryMax', 'positionsCount'],
  [],
];

const STEPS = [
  { title: 'Lo básico', hint: 'Puesto, área y dónde se trabaja' },
  { title: 'El puesto', hint: 'Descripción, responsabilidades y habilidades' },
  { title: 'Condiciones', hint: 'Salario, plazas y requisitos' },
  { title: 'Imagen y publicación', hint: 'Revisa y publica' },
] as const;

/** Clave del borrador en `localStorage`; el sufijo distingue alta de edición. */
const DRAFT_PREFIX = 'ij:vacancy-draft:';

/**
 * Alta y edición de vacante en cuatro pasos (T32, fase 3).
 *
 * **Sustituye al `ij-modal`**, que era la excepción que CLAUDE.md contempla: 19
 * campos, tres editores enriquecidos y las habilidades no caben en un diálogo
 * de 900 px. Editar usa el mismo wizard con los pasos ya validados, así que hay
 * un solo formulario que mantener y no dos versiones que se desincronizan.
 *
 * **El borrador se guarda en `localStorage` en cada cambio** y se ofrece
 * restaurar al volver. Perder veinte campos por recargar sin querer es el fallo
 * más caro que puede tener un formulario de este tamaño.
 */
@Component({
  selector: 'app-vacancy-wizard-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    IjButton,
    IjDatepicker,
    IjEditor,
    IjIcon,
    IjInput,
    IjSelect,
    VacancySkillsInput,
  ],
  template: `
    <div class="mx-auto max-w-[900px]">
      <a
        routerLink="/empresa/vacantes"
        class="mb-4 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-muted transition-colors hover:text-brand-strong"
      >
        <ij-icon name="chevron-left" [size]="16" />
        Vacantes
      </a>

      <h1 class="text-[28px] font-extrabold leading-tight tracking-tight text-ink-900">
        {{ editing() ? 'Editar vacante' : 'Publicar una vacante' }}
      </h1>
      <p class="mt-1 text-[13.5px] text-muted">
        {{ steps[step()].hint }}
      </p>

      <!-- Pasos: los ya visitados son clicables, los siguientes no -->
      <ol class="mt-6 flex flex-wrap gap-2">
        @for (item of steps; track item.title; let i = $index) {
          <li class="flex-1 min-w-[140px]">
            <button
              type="button"
              class="w-full rounded-xl border px-3 py-2.5 text-left transition-colors"
              [class]="stepClass(i)"
              [disabled]="!canJumpTo(i)"
              (click)="goTo(i)"
            >
              <span class="block text-[11px] font-bold uppercase tracking-wide opacity-70">
                Paso {{ i + 1 }}
              </span>
              <span class="block text-[13px] font-bold">{{ item.title }}</span>
            </button>
          </li>
        }
      </ol>

      @if (loading()) {
        <p class="mt-8 text-[13.5px] text-muted">Cargando vacante…</p>
      } @else {
        @if (draftAvailable()) {
          <div
            class="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
          >
            <p class="text-[13px] text-amber-900">
              Tienes un borrador sin publicar de esta vacante.
            </p>
            <div class="flex gap-2">
              <button
                type="button"
                class="rounded-lg bg-amber-600 px-3 py-1.5 text-[12.5px] font-bold text-white transition-colors hover:bg-amber-700"
                (click)="restoreDraft()"
              >
                Restaurar
              </button>
              <button
                type="button"
                class="rounded-lg border border-amber-300 px-3 py-1.5 text-[12.5px] font-bold text-amber-900 transition-colors hover:bg-amber-100"
                (click)="discardDraft()"
              >
                Descartar
              </button>
            </div>
          </div>
        }

        <form
          novalidate
          class="mt-6 rounded-2xl border border-line bg-white p-6 shadow-card"
          [formGroup]="form"
          (ngSubmit)="onSubmit()"
        >
          @if (error(); as message) {
            <p
              role="alert"
              class="mb-5 rounded-xl bg-red-50 px-4 py-3 text-[13.5px] font-medium text-red-700"
            >
              {{ message }}
            </p>
          }

          <!-- ---------------------------------------------- Paso 1 -->
          <div [hidden]="step() !== 0">
            <ij-input
              label="Título del puesto"
              placeholder="Desarrollador Frontend Sr."
              [required]="true"
              [maxLength]="160"
              formControlName="title"
            />

            <div class="mt-4 grid gap-4 sm:grid-cols-2">
              <ij-select
                label="Área profesional"
                placeholder="Elige un área"
                [required]="true"
                [options]="areaOptions"
                formControlName="professionalAreaId"
              />
              <ij-select
                label="Tipo de contratación"
                [required]="true"
                [options]="employmentOptions"
                [searchable]="false"
                formControlName="employmentType"
              />
              <ij-select
                label="Tipo de contrato"
                [required]="true"
                [options]="contractOptions"
                [searchable]="false"
                formControlName="contractType"
              />
              <ij-select
                label="Modalidad"
                [required]="true"
                [options]="workModeOptions"
                [searchable]="false"
                formControlName="workMode"
              />
              <ij-select
                label="Estado"
                placeholder="Elige un estado"
                [required]="true"
                [options]="stateOptions"
                formControlName="state"
              />
              <ij-input
                label="Municipio"
                placeholder="Zapopan"
                [required]="true"
                formControlName="municipality"
              />
            </div>
          </div>

          <!-- ---------------------------------------------- Paso 2 -->
          <div [hidden]="step() !== 1">
            <ij-editor
              label="Descripción del puesto"
              [required]="true"
              hint="Qué hace la persona, en qué equipo y qué ofrece la empresa."
              formControlName="description"
            />

            <div class="mt-5">
              <ij-editor
                label="Responsabilidades"
                hint="Mejor como lista: cada punto, una responsabilidad."
                formControlName="responsibilities"
              />
            </div>

            <div class="mt-5">
              <ij-editor
                label="Requisitos"
                hint="Estudios, experiencia y lo que no es negociable."
                formControlName="requirements"
              />
            </div>

            <div class="mt-5">
              <app-vacancy-skills-input [(skills)]="skills" />
            </div>

            @if (piiNotice(); as notice) {
              <p
                class="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-[13px] text-amber-900"
              >
                {{ notice }}
              </p>
            }
          </div>

          <!-- ---------------------------------------------- Paso 3 -->
          <div [hidden]="step() !== 2">
            <div class="grid gap-4 sm:grid-cols-2">
              <ij-select
                label="Experiencia requerida"
                [required]="true"
                [options]="experienceOptions"
                [searchable]="false"
                formControlName="experienceLevel"
              />
              <ij-select
                label="Escolaridad mínima"
                placeholder="Sin requisito"
                [options]="educationOptions"
                [searchable]="false"
                formControlName="minEducationLevel"
              />
              <ij-input
                label="Salario mínimo (MXN)"
                type="number"
                [min]="0"
                formControlName="salaryMin"
              />
              <ij-input
                label="Salario máximo (MXN)"
                type="number"
                [min]="0"
                formControlName="salaryMax"
              />
              <ij-input
                label="Número de plazas"
                type="number"
                [min]="1"
                formControlName="positionsCount"
              />
              <ij-datepicker
                label="Fecha límite para postularse"
                hint="Opcional. Después de este día deja de admitir postulaciones."
                formControlName="applicationDeadline"
              />
            </div>

            @if (salaryRangeInvalid()) {
              <p class="mt-3 text-[12.5px] font-medium text-red-600">
                El salario mínimo no puede ser mayor que el máximo.
              </p>
            }

            <div class="mt-5 space-y-3">
              <label class="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  class="mt-0.5 h-4 w-4 accent-brand"
                  formControlName="salaryHidden"
                />
                <span class="text-[13px] text-body">
                  No mostrar el salario en la publicación
                </span>
              </label>
              <label class="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  class="mt-0.5 h-4 w-4 accent-brand"
                  formControlName="hasCommissions"
                />
                <span class="text-[13px] text-body">
                  El puesto paga comisiones además del salario base
                </span>
              </label>
              @if (vacancy()?.canBeConfidential) {
                <label class="flex cursor-pointer items-start gap-2.5">
                  <input
                    type="checkbox"
                    class="mt-0.5 h-4 w-4 accent-brand"
                    formControlName="isConfidential"
                  />
                  <span class="text-[13px] text-body">
                    Publicación confidencial (no se muestra el nombre de la
                    empresa)
                  </span>
                </label>
              }
            </div>
          </div>

          <!-- ---------------------------------------------- Paso 4 -->
          <div [hidden]="step() !== 3">
            <p class="text-[13px] font-semibold text-ink-900">
              Imagen de referencia
            </p>
            <p class="mt-1 text-[12.5px] text-muted">
              Opcional. Se ve en la tarjeta del portal. JPG, PNG o WebP, máximo
              5 MB.
            </p>

            @if (imagePreview(); as preview) {
              <div class="mt-3 overflow-hidden rounded-xl border border-line">
                <img [src]="preview" alt="" class="h-44 w-full object-cover" />
              </div>
              <button
                type="button"
                class="mt-2 text-[12.5px] font-bold text-red-600 hover:underline"
                (click)="removeImage()"
              >
                Quitar imagen
              </button>
            } @else {
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                class="mt-3 block w-full text-[13px] text-body file:mr-3 file:rounded-lg file:border-0 file:bg-surface file:px-3 file:py-2 file:text-[13px] file:font-bold file:text-body"
                (change)="onImageSelected($event)"
              />
            }

            @if (imageError(); as message) {
              <p class="mt-2 text-[12.5px] font-medium text-red-600">
                {{ message }}
              </p>
            }

            <div class="mt-6 rounded-xl border border-line bg-surface p-4">
              <p class="text-[13px] font-bold text-ink-900">Resumen</p>
              <dl class="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                @for (item of summary(); track item.label) {
                  <div class="flex justify-between gap-3 text-[13px]">
                    <dt class="text-muted">{{ item.label }}</dt>
                    <dd class="text-right font-semibold text-body">
                      {{ item.value }}
                    </dd>
                  </div>
                }
              </dl>
            </div>
          </div>

          <!-- ------------------------------------------- Navegación -->
          <div
            class="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5"
          >
            <button
              type="button"
              class="rounded-xl border border-line bg-white px-4 py-2.5 text-[13.5px] font-bold text-body transition-colors hover:bg-surface disabled:opacity-50"
              [disabled]="step() === 0"
              (click)="previous()"
            >
              Anterior
            </button>

            <div class="flex items-center gap-3">
              @if (step() < steps.length - 1) {
                <button
                  ij-button
                  type="button"
                  variant="primary"
                  shape="rounded"
                  size="md"
                  (click)="next()"
                >
                  Continuar
                </button>
              } @else {
                <button
                  ij-button
                  type="submit"
                  variant="primary"
                  shape="rounded"
                  size="md"
                  [disabled]="saving()"
                >
                  {{ submitLabel() }}
                </button>
              }
            </div>
          </div>
        </form>
      }
    </div>
  `,
})
export class VacancyWizardPage {
  private readonly api = inject(VacanciesApi);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly vacancyId = this.route.snapshot.paramMap.get('id');

  protected readonly steps = STEPS;
  protected readonly step = signal(0);
  protected readonly furthestStep = signal(0);
  protected readonly vacancy = signal<Vacancy | null>(null);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly piiNotice = signal<string | null>(null);
  protected readonly imagePreview = signal<string | null>(null);
  protected readonly imageError = signal<string | null>(null);
  protected readonly draftAvailable = signal(false);
  protected readonly skills = signal<SaveVacancySkill[]>([]);

  private selectedImageFile: File | null = null;
  private imageRemoved = false;
  /** Mientras se precarga no se guarda borrador: no sería del usuario. */
  private hydrating = true;

  protected readonly editing = computed(() => this.vacancyId !== null);

  protected readonly areaOptions: IjOption[] = PROFESSIONAL_AREAS.map(
    (area) => ({ value: String(area.id), label: area.name }),
  );
  protected readonly stateOptions: IjOption[] = MX_STATES.map((state) => ({
    value: state.code,
    label: state.name,
  }));
  protected readonly employmentOptions = options(EMPLOYMENT_TYPE_LABELS);
  protected readonly workModeOptions = options(WORK_MODE_LABELS);
  protected readonly experienceOptions = options(EXPERIENCE_LEVEL_LABELS);
  protected readonly contractOptions = options(CONTRACT_TYPE_LABELS);
  protected readonly educationOptions = options(EDUCATION_LEVEL_LABELS);

  protected readonly form = this.fb.group({
    title: this.fb.control('', [Validators.required, Validators.maxLength(160)]),
    description: this.fb.control('', [Validators.required]),
    responsibilities: this.fb.control(''),
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
    positionsCount: this.fb.control<string>('1'),
    applicationDeadline: this.fb.control(''),
    hasCommissions: this.fb.control(false),
    salaryMin: this.fb.control<string>(''),
    salaryMax: this.fb.control<string>(''),
    salaryHidden: this.fb.control(false),
    isConfidential: this.fb.control(false),
  });

  constructor() {
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const { description, requirements, responsibilities } =
          this.form.getRawValue();
        this.piiNotice.set(
          piiWarning(`${description}\n${responsibilities}\n${requirements}`),
        );
        this.saveDraft();
      });

    if (this.vacancyId) this.load(this.vacancyId);
    else {
      this.hydrating = false;
      this.draftAvailable.set(this.hasDraft());
    }
  }

  // ------------------------------------------------------------ carga

  private load(id: string): void {
    this.loading.set(true);
    this.api
      .get(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (vacancy) => {
          this.vacancy.set(vacancy);
          this.patchFrom(vacancy);
          this.loading.set(false);
          this.hydrating = false;
          this.draftAvailable.set(this.hasDraft());
        },
        error: () => {
          this.loading.set(false);
          this.hydrating = false;
          this.error.set('No se pudo cargar la vacante.');
        },
      });
  }

  private patchFrom(vacancy: Vacancy): void {
    this.form.patchValue({
      title: vacancy.title,
      description: vacancy.description,
      responsibilities: vacancy.responsibilities ?? '',
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
      positionsCount: String(vacancy.positionsCount ?? 1),
      applicationDeadline: vacancy.applicationDeadline ?? '',
      hasCommissions: vacancy.hasCommissions,
      salaryMin: vacancy.salaryMin === null ? '' : String(vacancy.salaryMin),
      salaryMax: vacancy.salaryMax === null ? '' : String(vacancy.salaryMax),
      salaryHidden: vacancy.salaryHidden,
      isConfidential: vacancy.isConfidential,
    });
    this.skills.set(
      (vacancy.skills ?? []).map((skill) => ({
        skillId: skill.skillId,
        name: skill.name,
        isRequired: skill.isRequired,
        sortOrder: skill.sortOrder,
      })),
    );
    // Editar arranca con todos los pasos abiertos: los datos ya son válidos.
    this.furthestStep.set(STEPS.length - 1);
    if (vacancy.imageUrl) this.imagePreview.set(vacancy.imageUrl);
  }

  // --------------------------------------------------------- navegación

  protected stepClass(index: number): string {
    if (index === this.step()) return 'border-brand bg-brand-50 text-brand-strong';
    if (this.canJumpTo(index)) return 'border-line bg-white text-body hover:bg-surface';
    return 'border-line bg-white text-muted cursor-not-allowed opacity-60';
  }

  /** Sólo los pasos ya alcanzados: saltar al final sin llenar el 1 no ayuda. */
  protected canJumpTo(index: number): boolean {
    return index <= this.furthestStep();
  }

  protected goTo(index: number): void {
    if (!this.canJumpTo(index)) return;
    this.step.set(index);
  }

  protected next(): void {
    if (!this.validateStep(this.step())) return;
    const target = Math.min(this.step() + 1, STEPS.length - 1);
    this.step.set(target);
    this.furthestStep.update((value) => Math.max(value, target));
  }

  protected previous(): void {
    this.step.update((value) => Math.max(0, value - 1));
  }

  /** Marca sólo los controles del paso: no se acusa de vacío lo que no toca. */
  private validateStep(index: number): boolean {
    const names = STEP_CONTROLS[index];
    let valid = true;
    for (const name of names) {
      const control = this.form.get(name) as AbstractControl;
      control.markAsTouched();
      control.updateValueAndValidity({ emitEvent: false });
      if (control.invalid) valid = false;
    }
    if (index === 2 && this.salaryRangeInvalid()) valid = false;
    if (!valid) {
      this.error.set('Revisa los campos marcados antes de continuar.');
    } else {
      this.error.set(null);
    }
    return valid;
  }

  // ------------------------------------------------------------ borrador

  private get draftKey(): string {
    return `${DRAFT_PREFIX}${this.vacancyId ?? 'new'}`;
  }

  private saveDraft(): void {
    if (this.hydrating) return;
    try {
      localStorage.setItem(
        this.draftKey,
        JSON.stringify({
          form: this.form.getRawValue(),
          skills: this.skills(),
          savedAt: new Date().toISOString(),
        }),
      );
    } catch {
      // Modo privado o cuota llena: el borrador es una comodidad, no se avisa.
    }
  }

  private hasDraft(): boolean {
    try {
      return localStorage.getItem(this.draftKey) !== null;
    } catch {
      return false;
    }
  }

  protected restoreDraft(): void {
    try {
      const raw = localStorage.getItem(this.draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw) as {
        form: Record<string, unknown>;
        skills: SaveVacancySkill[];
      };
      this.form.patchValue(draft.form as never);
      this.skills.set(draft.skills ?? []);
      this.furthestStep.set(STEPS.length - 1);
    } catch {
      // Un borrador corrupto no debe impedir escribir uno nuevo.
    }
    this.draftAvailable.set(false);
  }

  protected discardDraft(): void {
    this.clearDraft();
    this.draftAvailable.set(false);
  }

  private clearDraft(): void {
    try {
      localStorage.removeItem(this.draftKey);
    } catch {
      /* nada que hacer */
    }
  }

  // --------------------------------------------------------------- imagen

  protected onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.imageError.set(null);
    if (file.size > 5 * 1024 * 1024) {
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
    this.imageRemoved = false;
    const reader = new FileReader();
    reader.onload = () => this.imagePreview.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  protected removeImage(): void {
    if (this.vacancy()?.imageUrl && !this.selectedImageFile) {
      this.imageRemoved = true;
    }
    this.selectedImageFile = null;
    this.imagePreview.set(null);
    this.imageError.set(null);
  }

  // ---------------------------------------------------------------- envío

  protected submitLabel(): string {
    if (this.saving()) return 'Guardando…';
    return this.editing() ? 'Guardar cambios' : 'Publicar vacante';
  }

  protected salaryRangeInvalid(): boolean {
    const min = numberOrNull(this.form.getRawValue().salaryMin);
    const max = numberOrNull(this.form.getRawValue().salaryMax);
    return min !== null && max !== null && min > max;
  }

  protected summary(): readonly { label: string; value: string }[] {
    const value = this.form.getRawValue();
    const area = PROFESSIONAL_AREAS.find(
      (item) => String(item.id) === value.professionalAreaId,
    );
    const state = MX_STATES.find((item) => item.code === value.state);
    return [
      { label: 'Puesto', value: value.title || '—' },
      { label: 'Área', value: area?.name ?? '—' },
      {
        label: 'Ubicación',
        value: state ? `${value.municipality}, ${state.name}` : '—',
      },
      { label: 'Modalidad', value: WORK_MODE_LABELS[value.workMode] },
      {
        label: 'Contratación',
        value: EMPLOYMENT_TYPE_LABELS[value.employmentType],
      },
      { label: 'Plazas', value: value.positionsCount || '1' },
      {
        label: 'Habilidades',
        value: this.skills().length ? String(this.skills().length) : 'Ninguna',
      },
    ];
  }

  protected onSubmit(): void {
    // Se validan **todos** los pasos, no sólo el último: se puede llegar aquí
    // saltando por la barra de pasos al editar.
    for (let i = 0; i < STEPS.length; i++) {
      if (!this.validateStep(i)) {
        this.step.set(i);
        return;
      }
    }

    const value = this.form.getRawValue();
    const payload: SaveVacancyPayload = {
      title: value.title.trim(),
      description: value.description,
      employmentType: value.employmentType,
      workMode: value.workMode,
      state: value.state,
      municipality: value.municipality.trim(),
      experienceLevel: value.experienceLevel,
      professionalAreaId: Number(value.professionalAreaId),
      contractType: value.contractType,
      positionsCount: Math.max(1, numberOrNull(value.positionsCount) ?? 1),
      hasCommissions: value.hasCommissions,
      salaryHidden: value.salaryHidden,
      // Siempre viaja, incluso vacío: al editar, `[]` es cómo se borran todas.
      skills: this.skills().map((skill, index) => ({
        ...skill,
        sortOrder: index,
      })),
    };
    if (value.responsibilities) payload.responsibilities = value.responsibilities;
    if (value.requirements) payload.requirements = value.requirements;
    if (value.minEducationLevel) {
      payload.minEducationLevel = value.minEducationLevel as EducationLevel;
    }
    if (value.applicationDeadline) {
      payload.applicationDeadline = value.applicationDeadline;
    }
    const salaryMin = numberOrNull(value.salaryMin);
    const salaryMax = numberOrNull(value.salaryMax);
    if (salaryMin !== null) payload.salaryMin = salaryMin;
    if (salaryMax !== null) payload.salaryMax = salaryMax;
    if (this.vacancy()?.canBeConfidential) {
      payload.isConfidential = value.isConfidential;
    }

    this.saving.set(true);
    this.error.set(null);
    const id = this.vacancyId;
    const request$ = id
      ? this.api.update(id, payload)
      : this.api.create(payload);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (saved) => this.afterSave(saved),
      error: (err: unknown) => {
        this.saving.set(false);
        this.error.set(
          messageOf(err, 'No se pudo guardar la vacante. Revisa los datos.'),
        );
      },
    });
  }

  /** La imagen va en una petición aparte: el alta la necesita ya creada. */
  private afterSave(saved: Vacancy): void {
    const finish = (): void => {
      this.saving.set(false);
      this.clearDraft();
      void this.router.navigate(['/empresa/vacantes', saved.id]);
    };

    if (this.selectedImageFile) {
      this.api
        .uploadImage(saved.id, this.selectedImageFile)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: finish,
          // La vacante ya se guardó: no se pierde por un fallo de la imagen.
          error: () => finish(),
        });
      return;
    }
    if (this.imageRemoved) {
      this.api
        .deleteImage(saved.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ next: finish, error: () => finish() });
      return;
    }
    finish();
  }
}

/** El input numérico entrega `''` cuando se vacía: eso no es un 0. */
function numberOrNull(value: string | number | null): number | null {
  if (value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function messageOf(error: unknown, fallback: string): string {
  const body = (error as { error?: { message?: string } })?.error;
  return body?.message ?? fallback;
}
