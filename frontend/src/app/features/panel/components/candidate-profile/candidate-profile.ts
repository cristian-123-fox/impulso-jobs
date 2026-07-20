import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CandidateProfileFacade } from '@/features/panel/data/candidate-profile.facade';
import {
  CandidateEducation,
  CandidateExperience,
  CandidateLanguage,
  CandidateSkill,
  EDUCATION_LEVEL_OPTIONS,
  LANGUAGE_LEVEL_OPTIONS,
  SKILL_LEVEL_OPTIONS,
} from '@/features/panel/models/candidate-profile.models';
import { MX_STATES } from '@/shared/catalogs/mx.catalogs';
import {
  IjButton,
  IjDatepicker,
  IjIcon,
  IjInput,
  IjOption,
  IjSelect,
  IjTextarea,
} from '@/shared/ui';

type TabKey = 'information' | 'experience' | 'education' | 'languages' | 'skills';
type ModalKind = 'photo' | 'experience' | 'education' | 'language' | 'skill' | null;

const INPUT =
  'w-full rounded-xl border border-line bg-surface px-4 py-3 text-[14px] font-semibold text-muted outline-none';
const LABEL = 'mb-2 block text-sm font-semibold text-ink-900';

@Component({
  selector: 'app-candidate-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    IjButton,
    IjIcon,
    IjInput,
    IjTextarea,
    IjSelect,
    IjDatepicker,
  ],
  host: { class: 'block' },
  template: `
    @if (facade.loading() && !profile()) {
      <div class="rounded-3xl bg-white p-8 shadow-card">
        <div class="animate-pulse space-y-4">
          <div class="h-7 w-56 rounded bg-surface"></div>
          <div class="h-4 w-80 rounded bg-surface"></div>
          <div class="h-40 rounded-2xl bg-surface"></div>
        </div>
      </div>
    } @else if (facade.error()) {
      <div class="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-card">
        <div class="flex items-start gap-3">
          <ij-icon name="alert-triangle" [size]="20" class="mt-0.5" />
          <div>
            <p class="font-semibold">{{ facade.error() }}</p>
            <button ij-button size="sm" shape="rounded" class="mt-4" (click)="reload()">
              Reintentar
            </button>
          </div>
        </div>
      </div>
    } @else if (profile(); as profile) {
      <div class="space-y-6">
        <section class="rounded-[28px] bg-white p-6 shadow-card sm:p-7">
          <div class="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div class="flex items-center gap-4">
              <div
                class="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[22px] border border-line bg-surface text-2xl font-extrabold text-brand"
              >
                @if (profile.profilePhotoUrl) {
                  <img
                    [src]="profile.profilePhotoUrl"
                    [alt]="'Foto de ' + profile.firstName"
                    class="h-full w-full object-cover"
                  />
                } @else {
                  {{ initials() }}
                }
              </div>

              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <h2 class="text-2xl font-extrabold text-ink-900">
                    {{ profile.firstName }} {{ profile.lastName }}
                  </h2>
                  <span class="rounded-full bg-brand/10 px-3 py-1 text-xs font-bold text-brand">
                    {{ profile.completion }}% completo
                  </span>
                </div>
                <p class="mt-1 text-[14px] text-muted">
                  {{ profile.professionalTitle || 'Agrega tu título profesional' }}
                </p>
                <p class="mt-1 text-[13px] text-muted">{{ profile.email }}</p>
              </div>
            </div>

            <div class="w-full max-w-[360px]">
              <div class="mb-2 flex items-center justify-between text-[13px] font-semibold">
                <span class="text-ink-900">Completitud del perfil</span>
                <span class="text-brand">{{ profile.completion }}%</span>
              </div>
              <div class="h-3 rounded-full bg-surface">
                <div
                  class="h-3 rounded-full bg-brand transition-all"
                  [style.width.%]="profile.completion"
                ></div>
              </div>
              <div class="mt-3 flex flex-wrap gap-2">
                @for (task of facade.completionTasks(); track task.label) {
                  <span
                    class="rounded-full px-3 py-1 text-[12px] font-semibold"
                    [class.bg-accent-green-soft]="task.done"
                    [class.text-accent-green]="task.done"
                    [class.bg-surface]="!task.done"
                    [class.text-muted]="!task.done"
                  >
                    {{ task.done ? 'Listo' : 'Pendiente' }} · {{ task.label }}
                  </span>
                }
              </div>
            </div>
          </div>

          <div class="mt-6 flex flex-wrap gap-2">
            @for (tab of tabs(); track tab.key) {
              <button type="button" [class]="tabClass(tab.key)" (click)="activeTab.set(tab.key)">
                {{ tab.label }}
                @if (tab.count !== null) {
                  <span class="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-bold">
                    {{ tab.count }}
                  </span>
                }
              </button>
            }
          </div>
        </section>

        @if (actionMessage()) {
          <div class="rounded-2xl border border-accent-green/20 bg-accent-green-soft p-4 text-[14px] font-semibold text-accent-green">
            {{ actionMessage() }}
          </div>
        }
        @if (actionError()) {
          <div class="rounded-2xl border border-red-200 bg-red-50 p-4 text-[14px] font-semibold text-red-700">
            {{ actionError() }}
          </div>
        }

        @switch (activeTab()) {
          @case ('information') {
            <section class="rounded-[28px] bg-white p-6 shadow-card sm:p-7">
              <div class="mb-6 flex items-center justify-between gap-3">
                <div>
                  <h3 class="text-xl font-extrabold text-ink-900">Información personal</h3>
                  <p class="mt-1 text-[14px] text-muted">
                    Tu correo y número de documento se muestran como solo lectura.
                  </p>
                </div>
                <button ij-button type="button" shape="rounded" size="sm" (click)="openPhotoModal()">
                  <ij-icon name="image" [size]="16" />
                  Foto
                </button>
              </div>

              <form [formGroup]="profileForm" class="grid gap-5 md:grid-cols-2" (ngSubmit)="saveProfile()">
                <ij-input label="Nombre" [required]="true" formControlName="firstName" />
                <ij-input label="Apellido" [required]="true" formControlName="lastName" />
                <div>
                  <label class="{{ labelClass }}">Correo</label>
                  <input [value]="profile.email" [class]="inputClass" readonly />
                </div>
                <div>
                  <label class="{{ labelClass }}">Documento</label>
                  <input [value]="profile.documentType + ' · ' + profile.documentNumber" [class]="inputClass" readonly />
                </div>
                <ij-input label="Título profesional" formControlName="professionalTitle" />
                <ij-datepicker label="Fecha de nacimiento" [required]="true" [max]="today" formControlName="birthDate" />
                <div class="md:col-span-2">
                  <ij-textarea label="Resumen profesional" [rows]="4" formControlName="summary" />
                </div>
                <div class="md:col-span-2">
                  <ij-input label="Dirección" formControlName="address" />
                </div>
                <ij-input label="País" formControlName="country" />
                <ij-select label="Estado" [required]="true" [options]="stateOptions" formControlName="state" />
                <div class="md:col-span-2">
                  <ij-input label="Municipio" [required]="true" formControlName="municipality" />
                </div>
                <div class="md:col-span-2 flex justify-end">
                  <button ij-button type="submit" shape="rounded" [disabled]="profileForm.invalid || submitting()">
                    {{ submitting() ? 'Guardando...' : 'Guardar información' }}
                  </button>
                </div>
              </form>
            </section>
          }

          @case ('experience') {
            <section class="rounded-[28px] bg-white p-6 shadow-card sm:p-7">
              <div class="mb-6 flex items-center justify-between gap-3">
                <div>
                  <h3 class="text-xl font-extrabold text-ink-900">Experiencia</h3>
                  <p class="mt-1 text-[14px] text-muted">
                    Registra tus cargos más relevantes y sus responsabilidades.
                  </p>
                </div>
                <button ij-button type="button" shape="rounded" size="sm" (click)="openExperienceModal()">
                  <ij-icon name="plus" [size]="16" />
                  Agregar
                </button>
              </div>
              @if (experiences().length) {
                <div class="space-y-4">
                  @for (item of experiences(); track item.id) {
                    <article class="rounded-2xl border border-line p-5">
                      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h4 class="text-lg font-bold text-ink-900">{{ item.jobTitle }}</h4>
                          <p class="mt-1 text-[14px] font-semibold text-brand">{{ item.companyName }}</p>
                          <p class="mt-1 text-[13px] text-muted">
                            {{ item.location }} · {{ dateLabel(item.startDate) }} -
                            {{ item.isCurrent ? 'Actual' : dateLabel(item.endDate) }}
                          </p>
                          @if (item.responsibilities) {
                            <p class="mt-3 text-[14px] leading-6 text-body">{{ item.responsibilities }}</p>
                          }
                        </div>
                        <div class="flex gap-2">
                          <button ij-button type="button" variant="soft" shape="rounded" size="sm" (click)="openExperienceModal(item)">
                            Editar
                          </button>
                          <button ij-button type="button" variant="white" shape="rounded" size="sm" (click)="deleteExperience(item)">
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </article>
                  }
                </div>
              } @else {
                <p class="rounded-2xl bg-surface px-5 py-8 text-center text-muted">
                  Aún no has agregado experiencia laboral.
                </p>
              }
            </section>
          }

          @case ('education') {
            <section class="rounded-[28px] bg-white p-6 shadow-card sm:p-7">
              <div class="mb-6 flex items-center justify-between gap-3">
                <div>
                  <h3 class="text-xl font-extrabold text-ink-900">Educación</h3>
                  <p class="mt-1 text-[14px] text-muted">
                    Incluye tu formación académica, técnica o profesional.
                  </p>
                </div>
                <button ij-button type="button" shape="rounded" size="sm" (click)="openEducationModal()">
                  <ij-icon name="plus" [size]="16" />
                  Agregar
                </button>
              </div>
              @if (educations().length) {
                <div class="space-y-4">
                  @for (item of educations(); track item.id) {
                    <article class="rounded-2xl border border-line p-5">
                      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h4 class="text-lg font-bold text-ink-900">{{ item.degreeName }}</h4>
                          <p class="mt-1 text-[14px] font-semibold text-brand">{{ educationLabel(item.educationLevel) }}</p>
                          <p class="mt-1 text-[13px] text-muted">
                            {{ item.institutionName }} · {{ dateLabel(item.startDate) }} -
                            {{ item.isCurrent ? 'Actual' : dateLabel(item.endDate) }}
                          </p>
                          @if (item.fieldOfStudy) {
                            <p class="mt-3 text-[14px] text-body">Área: {{ item.fieldOfStudy }}</p>
                          }
                        </div>
                        <div class="flex gap-2">
                          <button ij-button type="button" variant="soft" shape="rounded" size="sm" (click)="openEducationModal(item)">
                            Editar
                          </button>
                          <button ij-button type="button" variant="white" shape="rounded" size="sm" (click)="deleteEducation(item)">
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </article>
                  }
                </div>
              } @else {
                <p class="rounded-2xl bg-surface px-5 py-8 text-center text-muted">
                  Todavía no registras formación académica.
                </p>
              }
            </section>
          }

          @case ('languages') {
            <section class="rounded-[28px] bg-white p-6 shadow-card sm:p-7">
              <div class="mb-6 flex items-center justify-between gap-3">
                <div>
                  <h3 class="text-xl font-extrabold text-ink-900">Idiomas</h3>
                  <p class="mt-1 text-[14px] text-muted">
                    Los idiomas se eligen del catálogo y no pueden duplicarse.
                  </p>
                </div>
                <button ij-button type="button" shape="rounded" size="sm" (click)="openLanguageModal()">
                  <ij-icon name="plus" [size]="16" />
                  Agregar
                </button>
              </div>
              @if (languages().length) {
                <div class="grid gap-4 md:grid-cols-2">
                  @for (item of languages(); track item.id) {
                    <article class="rounded-2xl border border-line p-5">
                      <div class="flex items-start justify-between gap-4">
                        <div>
                          <h4 class="text-lg font-bold text-ink-900">{{ item.languageName }}</h4>
                          <p class="mt-1 text-[13px] text-muted">
                            {{ languageLevelLabel(item.level) }}
                            @if (item.isNative) {
                              <span class="font-semibold text-brand">· Nativo</span>
                            }
                          </p>
                        </div>
                        <div class="flex gap-2">
                          <button ij-button type="button" variant="soft" shape="rounded" size="sm" (click)="openLanguageModal(item)">
                            Editar
                          </button>
                          <button ij-button type="button" variant="white" shape="rounded" size="sm" (click)="deleteLanguage(item)">
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </article>
                  }
                </div>
              } @else {
                <p class="rounded-2xl bg-surface px-5 py-8 text-center text-muted">
                  Aún no has agregado idiomas a tu perfil.
                </p>
              }
            </section>
          }

          @case ('skills') {
            <section class="rounded-[28px] bg-white p-6 shadow-card sm:p-7">
              <div class="mb-6 flex items-center justify-between gap-3">
                <div>
                  <h3 class="text-xl font-extrabold text-ink-900">Habilidades</h3>
                  <p class="mt-1 text-[14px] text-muted">
                    Añade habilidades técnicas o blandas y su nivel de dominio.
                  </p>
                </div>
                <button ij-button type="button" shape="rounded" size="sm" (click)="openSkillModal()">
                  <ij-icon name="plus" [size]="16" />
                  Agregar
                </button>
              </div>
              @if (skills().length) {
                <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  @for (item of skills(); track item.id) {
                    <article class="rounded-2xl border border-line p-5">
                      <div class="flex items-start justify-between gap-4">
                        <div>
                          <h4 class="text-lg font-bold text-ink-900">{{ item.name }}</h4>
                          <p class="mt-1 text-[13px] text-muted">
                            {{ skillLevelLabel(item.level) }}
                            @if (item.yearsExperience !== null) {
                              <span>· {{ item.yearsExperience }} años</span>
                            }
                          </p>
                        </div>
                        <div class="flex gap-2">
                          <button ij-button type="button" variant="soft" shape="rounded" size="sm" (click)="openSkillModal(item)">
                            Editar
                          </button>
                          <button ij-button type="button" variant="white" shape="rounded" size="sm" (click)="deleteSkill(item)">
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </article>
                  }
                </div>
              } @else {
                <p class="rounded-2xl bg-surface px-5 py-8 text-center text-muted">
                  Tu perfil todavía no tiene habilidades registradas.
                </p>
              }
            </section>
          }
        }
      </div>
    }

    @if (modalKind()) {
      <div class="fixed inset-0 z-40 flex items-center justify-center bg-ink-900/55 p-4">
        <div class="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-float sm:p-7">
          <div class="mb-6 flex items-start justify-between gap-4">
            <div>
              <h3 class="text-xl font-extrabold text-ink-900">{{ modalTitle() }}</h3>
              <p class="mt-1 text-[14px] text-muted">{{ modalSubtitle() }}</p>
            </div>
            <button type="button" class="rounded-full p-2 text-muted hover:bg-surface" (click)="closeModal()">
              <ij-icon name="close" [size]="18" />
            </button>
          </div>

          @switch (modalKind()) {
            @case ('photo') {
              <form [formGroup]="photoForm" class="space-y-5" (ngSubmit)="savePhoto()">
                <ij-input label="URL de la foto" type="url" placeholder="https://..." formControlName="profilePhotoUrl" />
                <div class="flex justify-end gap-3">
                  <button ij-button type="button" variant="white" shape="rounded" (click)="closeModal()">Cancelar</button>
                  <button ij-button type="submit" shape="rounded" [disabled]="submitting()">
                    {{ submitting() ? 'Guardando...' : 'Guardar foto' }}
                  </button>
                </div>
              </form>
            }
            @case ('experience') {
              <form [formGroup]="experienceForm" class="grid gap-5 md:grid-cols-2" (ngSubmit)="saveExperience()">
                <ij-input label="Cargo" [required]="true" formControlName="jobTitle" />
                <ij-input label="Empresa" [required]="true" formControlName="companyName" />
                <ij-input label="Ubicación" [required]="true" formControlName="location" />
                <span class="hidden md:block"></span>
                <ij-datepicker label="Inicio" [required]="true" formControlName="startDate" />
                <ij-datepicker label="Fin" formControlName="endDate" />
                <label class="flex items-center gap-2 text-[14px] text-body"><input type="checkbox" formControlName="isCurrent" class="accent-brand" /> Trabajo actual</label>
                <div class="md:col-span-2"><ij-textarea label="Responsabilidades" [rows]="4" formControlName="responsibilities" /></div>
                <div class="md:col-span-2 flex justify-end gap-3">
                  <button ij-button type="button" variant="white" shape="rounded" (click)="closeModal()">Cancelar</button>
                  <button ij-button type="submit" shape="rounded" [disabled]="experienceForm.invalid || submitting()">{{ submitting() ? 'Guardando...' : 'Guardar' }}</button>
                </div>
              </form>
            }
            @case ('education') {
              <form [formGroup]="educationForm" class="grid gap-5 md:grid-cols-2" (ngSubmit)="saveEducation()">
                <ij-input label="Institución" [required]="true" formControlName="institutionName" />
                <ij-select label="Nivel" [required]="true" [options]="educationOptions" formControlName="educationLevel" />
                <ij-input label="Título" [required]="true" formControlName="degreeName" />
                <ij-input label="Área de estudio" formControlName="fieldOfStudy" />
                <ij-datepicker label="Inicio" [required]="true" formControlName="startDate" />
                <ij-datepicker label="Fin" formControlName="endDate" />
                <label class="flex items-center gap-2 text-[14px] text-body"><input type="checkbox" formControlName="isCurrent" class="accent-brand" /> En curso</label>
                <div class="md:col-span-2"><ij-textarea label="Descripción" [rows]="4" formControlName="description" /></div>
                <div class="md:col-span-2 flex justify-end gap-3">
                  <button ij-button type="button" variant="white" shape="rounded" (click)="closeModal()">Cancelar</button>
                  <button ij-button type="submit" shape="rounded" [disabled]="educationForm.invalid || submitting()">{{ submitting() ? 'Guardando...' : 'Guardar' }}</button>
                </div>
              </form>
            }
            @case ('language') {
              <form [formGroup]="languageForm" class="grid gap-5 md:grid-cols-2" (ngSubmit)="saveLanguage()">
                <ij-select label="Idioma" [required]="true" [options]="languageSelectOptions()" formControlName="languageCode" />
                <ij-select label="Nivel" [required]="true" [options]="languageOptions" formControlName="level" />
                <label class="flex items-center gap-2 text-[14px] text-body"><input type="checkbox" formControlName="isNative" class="accent-brand" /> Idioma nativo</label>
                <div class="md:col-span-2 flex justify-end gap-3">
                  <button ij-button type="button" variant="white" shape="rounded" (click)="closeModal()">Cancelar</button>
                  <button ij-button type="submit" shape="rounded" [disabled]="languageForm.invalid || submitting()">{{ submitting() ? 'Guardando...' : 'Guardar' }}</button>
                </div>
              </form>
            }
            @case ('skill') {
              <form [formGroup]="skillForm" class="grid gap-5 md:grid-cols-2" (ngSubmit)="saveSkill()">
                <ij-input label="Habilidad" [required]="true" formControlName="name" />
                <ij-select label="Nivel" [options]="skillSelectOptions" formControlName="level" />
                <ij-input label="Años de experiencia" type="number" [min]="0" formControlName="yearsExperience" />
                <div class="md:col-span-2 flex justify-end gap-3">
                  <button ij-button type="button" variant="white" shape="rounded" (click)="closeModal()">Cancelar</button>
                  <button ij-button type="submit" shape="rounded" [disabled]="skillForm.invalid || submitting()">{{ submitting() ? 'Guardando...' : 'Guardar' }}</button>
                </div>
              </form>
            }
          }
        </div>
      </div>
    }
  `,
})
export class CandidateProfileComponent {
  protected readonly facade = inject(CandidateProfileFacade);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly labelClass = LABEL;
  protected readonly inputClass = INPUT;
  protected readonly educationOptions = EDUCATION_LEVEL_OPTIONS;
  protected readonly languageOptions = LANGUAGE_LEVEL_OPTIONS;
  protected readonly skillOptions = SKILL_LEVEL_OPTIONS;
  protected readonly today = new Date().toISOString().slice(0, 10);
  protected readonly stateOptions: IjOption[] = MX_STATES.map((s) => ({
    value: s.code,
    label: s.name,
  }));
  protected readonly skillSelectOptions: IjOption[] = [
    { value: '', label: 'Sin especificar' },
    ...SKILL_LEVEL_OPTIONS,
  ];
  protected readonly languageSelectOptions = computed<IjOption[]>(() =>
    this.facade.languageCatalog().map((l) => ({ value: l.code, label: l.name })),
  );
  protected readonly activeTab = signal<TabKey>('information');
  protected readonly modalKind = signal<ModalKind>(null);
  protected readonly editingId = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly actionMessage = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);

  protected readonly profile = this.facade.profile;
  protected readonly experiences = this.facade.experiences;
  protected readonly educations = this.facade.educations;
  protected readonly languages = this.facade.languages;
  protected readonly skills = this.facade.skills;

  protected readonly tabs = computed(() => [
    { key: 'information' as const, label: 'Información', count: null },
    { key: 'experience' as const, label: 'Experiencia', count: this.experiences().length },
    { key: 'education' as const, label: 'Educación', count: this.educations().length },
    { key: 'languages' as const, label: 'Idiomas', count: this.languages().length },
    { key: 'skills' as const, label: 'Habilidades', count: this.skills().length },
  ]);

  protected readonly profileForm = this.fb.group({
    firstName: ['', [Validators.required, Validators.maxLength(80)]],
    lastName: ['', [Validators.required, Validators.maxLength(80)]],
    professionalTitle: ['', [Validators.maxLength(120)]],
    summary: ['', [Validators.maxLength(1000)]],
    address: ['', [Validators.maxLength(255)]],
    country: ['MX', [Validators.required, Validators.maxLength(2)]],
    state: ['', [Validators.required, Validators.maxLength(10)]],
    municipality: ['', [Validators.required, Validators.maxLength(120)]],
    birthDate: ['', [Validators.required]],
  });

  protected readonly photoForm = this.fb.group({
    profilePhotoUrl: [''],
  });

  protected readonly experienceForm = this.fb.group({
    jobTitle: ['', [Validators.required, Validators.maxLength(120)]],
    companyName: ['', [Validators.required, Validators.maxLength(160)]],
    location: ['', [Validators.required, Validators.maxLength(120)]],
    startDate: ['', [Validators.required]],
    endDate: [''],
    isCurrent: [false],
    responsibilities: ['', [Validators.maxLength(2000)]],
  });

  protected readonly educationForm = this.fb.group({
    institutionName: ['', [Validators.required, Validators.maxLength(160)]],
    educationLevel: ['BACHELOR', [Validators.required]],
    degreeName: ['', [Validators.required, Validators.maxLength(160)]],
    fieldOfStudy: ['', [Validators.maxLength(160)]],
    startDate: ['', [Validators.required]],
    endDate: [''],
    isCurrent: [false],
    description: ['', [Validators.maxLength(1000)]],
  });

  protected readonly languageForm = this.fb.group({
    languageCode: ['', [Validators.required]],
    level: ['INTERMEDIATE', [Validators.required]],
    isNative: [false],
  });

  protected readonly skillForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    level: [''],
    yearsExperience: [0],
  });

  constructor() {
    this.reload();

    effect(() => {
      const profile = this.profile();
      if (!profile) return;
      this.profileForm.patchValue({
        firstName: profile.firstName,
        lastName: profile.lastName,
        professionalTitle: profile.professionalTitle ?? '',
        summary: profile.summary ?? '',
        address: profile.address ?? '',
        country: profile.country,
        state: profile.state,
        municipality: profile.municipality,
        birthDate: profile.birthDate,
      });
      this.photoForm.patchValue({ profilePhotoUrl: profile.profilePhotoUrl ?? '' });
    });

    this.experienceForm.controls.isCurrent.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((isCurrent) => {
        if (isCurrent) this.experienceForm.controls.endDate.setValue('');
      });

    this.educationForm.controls.isCurrent.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((isCurrent) => {
        if (isCurrent) this.educationForm.controls.endDate.setValue('');
      });

    this.languageForm.controls.isNative.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((isNative) => {
        if (isNative) this.languageForm.controls.level.setValue('NATIVE');
      });
  }

  protected reload(): void {
    this.facade.loadAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  protected initials(): string {
    const profile = this.profile();
    return profile ? `${profile.firstName[0] ?? ''}${profile.lastName[0] ?? ''}` : 'IJ';
  }

  protected tabClass(key: TabKey): string {
    const base =
      'inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-bold transition-colors';
    return key === this.activeTab()
      ? `${base} bg-brand text-white`
      : `${base} bg-surface text-muted hover:text-body`;
  }

  protected dateLabel(value: string | null): string {
    if (!value) return 'Sin fecha';
    const [year, month] = value.split('-');
    return `${month}/${year}`;
  }

  protected educationLabel(value: string): string {
    return this.educationOptions.find((item) => item.value === value)?.label ?? value;
  }

  protected languageLevelLabel(value: string): string {
    return this.languageOptions.find((item) => item.value === value)?.label ?? value;
  }

  protected skillLevelLabel(value: string | null): string {
    return this.skillOptions.find((item) => item.value === value)?.label ?? 'Sin nivel';
  }

  protected modalTitle(): string {
    return {
      photo: 'Actualizar foto',
      experience: this.editingId() ? 'Editar experiencia' : 'Nueva experiencia',
      education: this.editingId() ? 'Editar educación' : 'Nueva educación',
      language: this.editingId() ? 'Editar idioma' : 'Nuevo idioma',
      skill: this.editingId() ? 'Editar habilidad' : 'Nueva habilidad',
      null: '',
    }[String(this.modalKind()) as 'photo' | 'experience' | 'education' | 'language' | 'skill' | 'null'];
  }

  protected modalSubtitle(): string {
    return {
      photo: 'Guarda la URL de la foto principal que quieres mostrar en tu perfil.',
      experience: 'Las fechas deben ser coherentes y la fecha de inicio no puede ser futura.',
      education: 'Usa el nivel que mejor represente la formación obtenida.',
      language: 'Si marcas el idioma como nativo, el nivel se ajusta automáticamente.',
      skill: 'Agrega la habilidad y, si quieres, indica años de experiencia.',
      null: '',
    }[String(this.modalKind()) as 'photo' | 'experience' | 'education' | 'language' | 'skill' | 'null'];
  }

  protected openPhotoModal(): void {
    this.clearFeedback();
    this.editingId.set(null);
    this.modalKind.set('photo');
  }

  protected openExperienceModal(item?: CandidateExperience): void {
    this.clearFeedback();
    this.editingId.set(item?.id ?? null);
    this.experienceForm.reset({
      jobTitle: item?.jobTitle ?? '',
      companyName: item?.companyName ?? '',
      location: item?.location ?? '',
      startDate: item?.startDate ?? '',
      endDate: item?.endDate ?? '',
      isCurrent: item?.isCurrent ?? false,
      responsibilities: item?.responsibilities ?? '',
    });
    this.modalKind.set('experience');
  }

  protected openEducationModal(item?: CandidateEducation): void {
    this.clearFeedback();
    this.editingId.set(item?.id ?? null);
    this.educationForm.reset({
      institutionName: item?.institutionName ?? '',
      educationLevel: item?.educationLevel ?? 'BACHELOR',
      degreeName: item?.degreeName ?? '',
      fieldOfStudy: item?.fieldOfStudy ?? '',
      startDate: item?.startDate ?? '',
      endDate: item?.endDate ?? '',
      isCurrent: item?.isCurrent ?? false,
      description: item?.description ?? '',
    });
    this.modalKind.set('education');
  }

  protected openLanguageModal(item?: CandidateLanguage): void {
    this.clearFeedback();
    this.editingId.set(item?.id ?? null);
    this.languageForm.reset({
      languageCode: item?.languageCode ?? this.facade.languageCatalog()[0]?.code ?? '',
      level: item?.level ?? 'INTERMEDIATE',
      isNative: item?.isNative ?? false,
    });
    this.modalKind.set('language');
  }

  protected openSkillModal(item?: CandidateSkill): void {
    this.clearFeedback();
    this.editingId.set(item?.id ?? null);
    this.skillForm.reset({
      name: item?.name ?? '',
      level: item?.level ?? '',
      yearsExperience: item?.yearsExperience ?? 0,
    });
    this.modalKind.set('skill');
  }

  protected closeModal(): void {
    this.modalKind.set(null);
    this.editingId.set(null);
    this.submitting.set(false);
  }

  protected saveProfile(): void {
    if (this.profileForm.invalid) return;
    this.runMutation(
      this.facade.saveProfile(this.profileForm.getRawValue()),
      'Información actualizada.',
      () => this.reload(),
    );
  }

  protected savePhoto(): void {
    this.runMutation(
      this.facade.updatePhoto({ profilePhotoUrl: this.photoForm.getRawValue().profilePhotoUrl || null }),
      'Foto actualizada.',
      () => {
        this.closeModal();
        this.reload();
      },
    );
  }

  protected saveExperience(): void {
    if (this.experienceForm.invalid) return;
    this.runMutation(
      this.facade.saveExperience(this.experienceForm.getRawValue(), this.editingId() ?? undefined),
      this.editingId() ? 'Experiencia actualizada.' : 'Experiencia agregada.',
      () => this.closeModal(),
    );
  }

  protected saveEducation(): void {
    if (this.educationForm.invalid) return;
    this.runMutation(
      this.facade.saveEducation(this.educationForm.getRawValue(), this.editingId() ?? undefined),
      this.editingId() ? 'Educación actualizada.' : 'Educación agregada.',
      () => this.closeModal(),
    );
  }

  protected saveLanguage(): void {
    if (this.languageForm.invalid) return;
    this.runMutation(
      this.facade.saveLanguage(this.languageForm.getRawValue(), this.editingId() ?? undefined),
      this.editingId() ? 'Idioma actualizado.' : 'Idioma agregado.',
      () => this.closeModal(),
    );
  }

  protected saveSkill(): void {
    if (this.skillForm.invalid) return;
    const value = this.skillForm.getRawValue();
    this.runMutation(
      this.facade.saveSkill(
        {
          ...value,
          level: value.level || null,
          yearsExperience: value.yearsExperience ?? null,
        },
        this.editingId() ?? undefined,
      ),
      this.editingId() ? 'Habilidad actualizada.' : 'Habilidad agregada.',
      () => this.closeModal(),
    );
  }

  protected deleteExperience(item: CandidateExperience): void {
    if (!window.confirm(`Eliminar la experiencia "${item.jobTitle}"?`)) return;
    this.runMutation(this.facade.deleteExperience(item.id), 'Experiencia eliminada.');
  }

  protected deleteEducation(item: CandidateEducation): void {
    if (!window.confirm(`Eliminar la educación "${item.degreeName}"?`)) return;
    this.runMutation(this.facade.deleteEducation(item.id), 'Educación eliminada.');
  }

  protected deleteLanguage(item: CandidateLanguage): void {
    if (!window.confirm(`Eliminar el idioma "${item.languageName}"?`)) return;
    this.runMutation(this.facade.deleteLanguage(item.id), 'Idioma eliminado.');
  }

  protected deleteSkill(item: CandidateSkill): void {
    if (!window.confirm(`Eliminar la habilidad "${item.name}"?`)) return;
    this.runMutation(this.facade.deleteSkill(item.id), 'Habilidad eliminada.');
  }

  private runMutation(
    request$: import('rxjs').Observable<unknown>,
    successMessage: string,
    onSuccess?: () => void,
  ): void {
    this.submitting.set(true);
    this.clearFeedback();
    request$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.actionMessage.set(successMessage);
          onSuccess?.();
        },
        error: (error) => {
          this.submitting.set(false);
          this.actionError.set(
            error?.error?.message ?? 'No pudimos guardar los cambios. Revisa la información e intenta de nuevo.',
          );
        },
      });
  }

  private clearFeedback(): void {
    this.actionMessage.set(null);
    this.actionError.set(null);
  }
}
