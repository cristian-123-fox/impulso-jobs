import { DatePipe, isPlatformServer, Location } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  makeStateKey,
  PLATFORM_ID,
  signal,
  TransferState,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '@/core/auth/auth.service';
import { ApiErrorResponse } from '@/core/models/api-response.models';
import { Role } from '@/core/models/role.enum';
import { SeoService } from '@/core/services/seo.service';
import { vacancyPath } from '@/shared/utils/seo';
import { CandidateApplicationsApi } from '@/features/candidate/data/candidate-applications.api';
import { CandidateSavedVacanciesApi } from '@/features/candidate/data/candidate-saved-vacancies.api';
import { MX_STATES } from '@/shared/catalogs/mx.catalogs';
import { PROFESSIONAL_AREA_NAMES } from '@/shared/catalogs/professional-areas.catalogs';
import { IconName, IjButton, IjIcon, IjModal } from '@/shared/ui';
import { PublicVacanciesApi } from '@/features/public/vacancies/data/public-vacancies.api';
import {
  ApplicationAnswerPayload,
  CONTRACT_TYPE_LABELS,
  ContractType,
  EDUCATION_LEVEL_LABELS,
  EducationLevel,
  EMPLOYMENT_TYPE_LABELS,
  EmploymentType,
  EXPERIENCE_LEVEL_LABELS,
  ExperienceLevel,
  PublicVacancy,
  PublicVacancyQuestion,
  VACANCY_REPORT_REASONS,
  WORK_MODE_LABELS,
  WorkMode,
} from '@/features/public/vacancies/models/public-vacancies.models';

const STATE_NAMES = new Map(MX_STATES.map((s) => [s.code, s.name]));

/** Vacante renderizada en SSR, transferida para hidratar sin re-pedir (T16). */
const DETAIL_STATE_KEY = makeStateKey<PublicVacancy>('public-vacancy-detail');
const JSON_LD_ID = 'vacancy-jobposting';

/** `EmploymentType` propio → enum de schema.org/JobPosting. */
const SCHEMA_EMPLOYMENT: Record<string, string> = {
  FULL_TIME: 'FULL_TIME',
  PART_TIME: 'PART_TIME',
  CONTRACT: 'CONTRACTOR',
  TEMPORARY: 'TEMPORARY',
  INTERNSHIP: 'INTERN',
};

interface DetailItem {
  readonly icon: IconName;
  readonly label: string;
  readonly value: string;
}

interface ShareLink {
  readonly label: string;
  readonly href: string;
  readonly classes: string;
}

interface MapCoords {
  readonly lat: number;
  readonly lng: number;
  readonly zoom: number;
}

/** Color de marca (tailwind.config.js) para el marcador del mapa. */
const BRAND_COLOR = '#e47c3f';

/** Skills quemadas por enquanto — se reemplazarán con datos del backend. */
const JOB_SKILLS = [
  'Html',
  'Python',
  'WordPress',
  'JavaScript',
  'Figma',
  'Angular',
  'Reactjs',
  'Drupal',
  'Joomla',
];

/** Detalle público de una vacante activa. Oculta la empresa si es confidencial. */
@Component({
  selector: 'app-public-vacancy-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterLink, IjButton, IjIcon, IjModal],
  styles: `
    .vacancy-banner {
      background: linear-gradient(135deg, #0f2027 0%, #203a43 40%, #2c5364 100%);
    }
  `,
  template: `
    <section class="px-6 py-10 lg:px-[60px]">
      <div class="mx-auto max-w-[1100px]">
        <a
          routerLink="/vacantes"
          class="mb-5 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-muted transition-colors hover:text-brand"
        >
          <ij-icon name="chevron-left" [size]="16" />
          Todas las vacantes
        </a>

        @switch (state()) {
          @case ('loading') {
            <div class="rounded-2xl bg-white p-12 text-center text-muted shadow-card">
              Cargando vacante…
            </div>
          }
          @case ('error') {
            <div class="rounded-2xl bg-white p-12 text-center shadow-card">
              <p class="text-[15px] font-semibold text-ink-900">
                Esta vacante ya no está disponible.
              </p>
              <a
                ij-button
                routerLink="/vacantes"
                variant="primary"
                shape="rounded"
                size="md"
                class="mt-5"
              >
                Ver otras vacantes
              </a>
            </div>
          }
          @default {
            @if (vacancy(); as data) {
              <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                <article class="rounded-2xl bg-white p-6 shadow-card sm:p-8">
                  <div class="vacancy-banner relative h-[280px] overflow-hidden rounded-2xl">
                    @if (isNew()) {
                      <span
                        class="absolute top-4 left-4 z-10 rounded-md bg-accent-green px-3 py-1 text-[13px] font-bold text-white"
                      >
                        New
                      </span>
                    }
                  </div>

                  <div class="relative -mt-7 mb-2 flex items-end justify-between px-1">
                    @if (data.company?.logoUrl; as logo) {
                      <div
                        class="flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-white shadow-card"
                      >
                        <img [src]="logo" [alt]="data.company!.businessName" class="h-full w-full object-cover" />
                      </div>
                    }
                  </div>

                  <div class="mt-10 flex flex-wrap items-start justify-between gap-4">
                    <div class="min-w-0">
                      <h1 class="text-[26px] font-extrabold leading-tight text-ink-900">
                        {{ data.title }}
                      </h1>
                      <p class="mt-1 text-[14px]">
                        <span class="text-accent-green font-semibold">/ {{ postedAgo() }}</span>
                      </p>
                    </div>

                    <div class="flex flex-shrink-0 flex-wrap items-start justify-end gap-2">
                      @if (auth.currentUser()?.role === candidateRole) {
                        @if (applyState() === 'applied') {
                          <div class="text-right">
                            <span
                              class="inline-flex items-center gap-1.5 rounded-md bg-accent-green-soft px-3 py-2 text-[13px] font-bold text-accent-green"
                            >
                              <ij-icon name="check" [size]="15" [strokeWidth]="3" />
                              Ya te postulaste
                            </span>
                            <a
                              routerLink="/candidato/postulaciones"
                              class="mt-1.5 block text-[12.5px] font-semibold text-brand hover:underline"
                            >
                              Ver mis postulaciones
                            </a>
                          </div>
                        } @else {
                          <button
                            ij-button
                            type="button"
                            variant="primary"
                            shape="pill"
                            size="lg"
                            [disabled]="applyState() === 'submitting'"
                            (click)="onApplyClick(data.id)"
                          >
                            {{ applyState() === 'submitting' ? 'Enviando…' : 'Aplicar ahora' }}
                          </button>
                        }
                      } @else {
                        <a
                          ij-button
                          [routerLink]="['/auth/login']"
                          [queryParams]="{ returnUrl: vacancyPath(data) }"
                          variant="primary"
                          shape="pill"
                          size="lg"
                        >
                          Aplicar ahora
                        </a>
                      }
                      @if (auth.currentUser()?.role === candidateRole) {
                        <button
                          type="button"
                          [class]="saveButtonClass()"
                          [disabled]="savePending()"
                          [attr.aria-pressed]="saved()"
                          (click)="toggleSave(data.id)"
                        >
                          <ij-icon name="bookmark" [size]="15" />
                          {{ saved() ? 'Guardada' : 'Guardar' }}
                        </button>
                      }
                    </div>
                  </div>

                  <p class="mt-3 inline-flex items-center gap-1.5 text-[14px] text-body">
                    <ij-icon name="map-pin" [size]="16" class="text-muted" />
                    {{ data.municipality }}, {{ stateName(data.state) }}
                  </p>

                  <div class="mt-4 flex flex-wrap items-center justify-between gap-4">
                    <div class="flex items-center gap-4">
                      <span class="text-[15px] font-bold text-ink-900">
                        {{ salary(data) }}
                        <span class="text-accent-green font-semibold">/ Month</span>
                      </span>
                    </div>

                    @if (data.applicationDeadline) {
                      <p class="text-[13.5px] text-muted">
                        Application ends:
                        <span class="font-bold text-brand">{{ dateOnlyLabel(data.applicationDeadline) }}</span>
                      </p>
                    }
                  </div>

                  @if (applyError(); as error) {
                    <p class="mt-4 rounded-xl bg-red-50 px-4 py-2.5 text-[13px] font-semibold text-red-700">
                      {{ error }}
                    </p>
                  }

                  <h2 class="mt-8 text-lg font-bold text-ink-900">Job Description:</h2>
                  <p class="mt-3 whitespace-pre-line text-[14.5px] leading-relaxed text-body">
                    {{ data.description }}
                  </p>

                  @if (data.requirements) {
                    <h2 class="mt-8 text-lg font-bold text-ink-900">Requirements:</h2>
                    <ul class="mt-3 space-y-3">
                      @for (item of lines(data.requirements); track $index) {
                        <li class="flex items-start gap-3 text-[14.5px] leading-relaxed text-body">
                          <ij-icon name="check" [size]="18" class="mt-0.5 flex-shrink-0 text-accent-blue" [strokeWidth]="3" />
                          <span>{{ item }}</span>
                        </li>
                      }
                    </ul>
                  }

                  <h2 class="mt-8 text-lg font-bold text-ink-900">Responsibilities:</h2>
                  <ul class="mt-3 space-y-3">
                    @for (item of lines(data.description); track $index) {
                      <li class="flex items-start gap-3 text-[14.5px] leading-relaxed text-body">
                        <ij-icon name="check" [size]="18" class="mt-0.5 flex-shrink-0 text-accent-blue" [strokeWidth]="3" />
                        <span>{{ item }}</span>
                      </li>
                    }
                  </ul>

                  @if (shareLinks().length > 0) {
                    <h2 class="mt-7 border-t border-line pt-5 text-base font-bold text-ink-900">
                      Compartir vacante
                    </h2>
                    <div class="mt-3 flex flex-wrap gap-2">
                      @for (link of shareLinks(); track link.label) {
                        <a
                          [href]="link.href"
                          target="_blank"
                          rel="noopener noreferrer"
                          [class]="
                            'rounded-full px-4 py-1.5 text-[12.5px] font-bold text-white transition-opacity hover:opacity-85 ' +
                            link.classes
                          "
                        >
                          {{ link.label }}
                        </a>
                      }
                    </div>
                  }

                  <h2 class="mt-7 border-t border-line pt-5 text-base font-bold text-ink-900">
                    Ubicación
                  </h2>
                  <p class="mt-1.5 inline-flex items-center gap-1.5 text-[13.5px] text-muted">
                    <ij-icon name="map-pin" [size]="15" />
                    {{ data.municipality }}, {{ stateName(data.state) }}
                  </p>
                  @if (mapCoords()) {
                    <div
                      #mapEl
                      class="relative z-0 mt-3 h-[260px] w-full overflow-hidden rounded-2xl border border-line"
                    ></div>
                  }

                  <div
                    class="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4"
                  >
                    <p class="text-[12.5px] text-muted">
                      Publicada el {{ data.publishedAt | date: 'dd MMM yyyy' }}
                    </p>
                    @if (auth.currentUser()?.role === candidateRole) {
                      <button
                        type="button"
                        class="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-muted transition-colors hover:text-red-600"
                        (click)="openReport()"
                      >
                        <ij-icon name="alert-triangle" [size]="14" />
                        Denunciar esta vacante
                      </button>
                    }
                  </div>
                </article>

                <aside class="space-y-5">
                  <div class="rounded-2xl bg-white p-6 shadow-card">
                    <h2 class="text-base font-bold text-ink-900">Información del empleo</h2>
                    <dl class="mt-4 space-y-4">
                      @for (item of details(data); track item.label) {
                        <div class="flex items-start gap-3">
                          <span
                            class="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand"
                          >
                            <ij-icon [name]="item.icon" [size]="17" />
                          </span>
                          <div>
                            <dt class="text-[11.5px] font-bold uppercase tracking-wide text-muted">
                              {{ item.label }}
                            </dt>
                            <dd class="mt-0.5 text-[13.5px] font-semibold text-body">
                              {{ item.value }}
                            </dd>
                          </div>
                        </div>
                      }
                    </dl>
                  </div>

                  <div class="rounded-2xl bg-white p-6 shadow-card">
                    <h2 class="border-l-4 border-brand pl-3 text-lg font-bold text-ink-900">
                      Job Skills
                    </h2>
                    <div class="mt-4 flex flex-wrap gap-2">
                      @for (skill of jobSkills; track skill) {
                        <span
                          class="rounded-full bg-slate-100 px-4 py-1.5 text-[13px] font-semibold text-orange-700"
                        >
                          {{ skill }}
                        </span>
                      }
                    </div>
                  </div>

                  <div class="rounded-2xl bg-white p-6 shadow-card">
                    <div class="flex items-center gap-3">
                      <span
                        class="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-line bg-brand-50 text-base font-extrabold text-brand"
                      >
                        @if (data.company?.logoUrl; as logo) {
                          <img [src]="logo" alt="" class="h-full w-full object-cover" />
                        } @else {
                          ··
                        }
                      </span>
                      <div class="min-w-0">
                        <h2 class="truncate text-[15px] font-bold text-ink-900">
                          {{ data.company?.businessName ?? 'Empresa confidencial' }}
                        </h2>
                        @if (data.company?.economicSector; as sector) {
                          <p class="truncate text-[12.5px] text-muted">{{ sector }}</p>
                        }
                      </div>
                    </div>

                    @if (data.isConfidential) {
                      <p class="mt-4 rounded-xl bg-surface px-4 py-3 text-[12.5px] text-muted">
                        La empresa se dará a conocer durante el proceso de selección.
                      </p>
                    } @else if (data.company; as company) {
                      <dl class="mt-4 space-y-2.5 border-t border-line pt-4">
                        @if (company.municipality) {
                          <div class="flex items-center gap-2 text-[13px] text-body">
                            <ij-icon name="map-pin" [size]="15" class="text-muted" />
                            {{ company.municipality }},
                            {{ stateName(company.state) }}
                          </div>
                        }
                      </dl>
                    }
                  </div>
                </aside>
              </div>

              @if (applyOpen()) {
                <ij-modal
                  title="Postularme"
                  [subtitle]="data.title"
                  (close)="applyOpen.set(false)"
                >
                  <p class="mb-4 text-[13px] text-muted">
                    La empresa pide responder estas preguntas para postularte.
                  </p>

                  <div class="space-y-5">
                    @for (question of questions(); track question.id) {
                      <div>
                        <p class="text-[13.5px] font-bold text-ink-900">
                          {{ question.questionText }}
                        </p>
                        @if (question.questionType === 'CLOSED') {
                          <div class="mt-2 space-y-1.5">
                            @for (option of question.options; track option.id) {
                              <label
                                class="flex cursor-pointer items-center gap-2.5 rounded-xl border border-line px-3.5 py-2.5 text-[13.5px] text-body transition-colors hover:bg-surface"
                                [class.border-brand]="draftOf(question.id)?.optionId === option.id"
                                [class.bg-brand-50]="draftOf(question.id)?.optionId === option.id"
                              >
                                <input
                                  type="radio"
                                  [name]="'q-' + question.id"
                                  class="h-4 w-4 text-brand"
                                  [checked]="draftOf(question.id)?.optionId === option.id"
                                  (change)="setOption(question.id, option.id)"
                                />
                                {{ option.optionText }}
                              </label>
                            }
                          </div>
                        } @else {
                          <textarea
                            rows="3"
                            maxlength="1000"
                            placeholder="Escribe tu respuesta"
                            class="mt-2 w-full rounded-xl border border-line px-3.5 py-2.5 text-[13.5px] text-ink-900 outline-none focus:border-brand"
                            [value]="draftOf(question.id)?.answerText ?? ''"
                            (input)="setAnswerText(question.id, $any($event.target).value)"
                          ></textarea>
                        }
                      </div>
                    }
                  </div>

                  @if (applyError(); as error) {
                    <p class="mt-4 rounded-xl bg-red-50 px-4 py-2.5 text-[13px] font-semibold text-red-700">
                      {{ error }}
                    </p>
                  }

                  <div class="mt-6 flex justify-end gap-3 border-t border-line pt-4">
                    <button
                      type="button"
                      class="rounded-xl border border-line bg-white px-4 py-2.5 text-[13.5px] font-bold text-body transition-colors hover:bg-surface"
                      (click)="applyOpen.set(false)"
                    >
                      Cancelar
                    </button>
                    <button
                      ij-button
                      type="button"
                      variant="primary"
                      shape="rounded"
                      size="md"
                      [disabled]="!answersComplete() || applyState() === 'submitting'"
                      (click)="submitApplication(data.id)"
                    >
                      {{ applyState() === 'submitting' ? 'Enviando…' : 'Enviar postulación' }}
                    </button>
                  </div>
                </ij-modal>
              }

              @if (reportOpen()) {
                <ij-modal
                  title="Denunciar vacante"
                  [subtitle]="data.title"
                  size="sm"
                  (close)="closeReport()"
                >
                  @if (reportState() === 'done') {
                    <p class="rounded-xl bg-accent-green-soft px-4 py-3 text-[13.5px] font-semibold text-accent-green">
                      Gracias por tu reporte. Nuestro equipo revisará esta vacante.
                    </p>
                    <div class="mt-5 flex justify-end">
                      <button ij-button type="button" variant="primary" shape="rounded" size="md" (click)="closeReport()">
                        Cerrar
                      </button>
                    </div>
                  } @else {
                    <div class="space-y-1.5">
                      @for (reason of reportReasons; track reason.code) {
                        <label
                          class="flex cursor-pointer items-center gap-2.5 rounded-xl border border-line px-3.5 py-2.5 text-[13.5px] text-body transition-colors hover:bg-surface"
                          [class.border-brand]="reportReason() === reason.code"
                          [class.bg-brand-50]="reportReason() === reason.code"
                        >
                          <input
                            type="radio"
                            name="report-reason"
                            class="h-4 w-4 text-brand"
                            [checked]="reportReason() === reason.code"
                            (change)="reportReason.set(reason.code)"
                          />
                          {{ reason.label }}
                        </label>
                      }
                    </div>

                    <textarea
                      rows="3"
                      maxlength="500"
                      placeholder="Cuéntanos más (opcional)"
                      class="mt-3 w-full rounded-xl border border-line px-3.5 py-2.5 text-[13.5px] text-ink-900 outline-none focus:border-brand"
                      [value]="reportComment()"
                      (input)="reportComment.set($any($event.target).value)"
                    ></textarea>

                    @if (reportError(); as error) {
                      <p class="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-[13px] font-semibold text-red-700">
                        {{ error }}
                      </p>
                    }

                    <div class="mt-5 flex justify-end gap-3 border-t border-line pt-4">
                      <button
                        type="button"
                        class="rounded-xl border border-line bg-white px-4 py-2.5 text-[13.5px] font-bold text-body transition-colors hover:bg-surface"
                        (click)="closeReport()"
                      >
                        Cancelar
                      </button>
                      <button
                        ij-button
                        type="button"
                        variant="primary"
                        shape="rounded"
                        size="md"
                        [disabled]="!reportReason() || reportState() === 'submitting'"
                        (click)="submitReport(data.id)"
                      >
                        {{ reportState() === 'submitting' ? 'Enviando…' : 'Enviar denuncia' }}
                      </button>
                    </div>
                  }
                </ij-modal>
              }
            }
          }
        }
      </div>
    </section>
  `,
})
export class PublicVacancyDetailPage {
  private readonly api = inject(PublicVacanciesApi);
  private readonly applicationsApi = inject(CandidateApplicationsApi);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly auth = inject(AuthService);

  private readonly savedApi = inject(CandidateSavedVacanciesApi);
  private readonly seo = inject(SeoService);
  private readonly location = inject(Location);
  private readonly transferState = inject(TransferState);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly candidateRole = Role.CANDIDATE;
  protected readonly jobSkills = JOB_SKILLS;
  protected readonly vacancy = signal<PublicVacancy | null>(null);
  // Guardar vacante (T17): estado del toggle.
  protected readonly saved = signal(false);
  protected readonly savePending = signal(false);
  protected readonly state = signal<'loading' | 'loaded' | 'error'>('loading');
  protected readonly applyState = signal<'idle' | 'submitting' | 'applied'>('idle');
  protected readonly applyError = signal<string | null>(null);
  protected readonly shareLinks = signal<readonly ShareLink[]>([]);
  protected readonly mapCoords = signal<MapCoords | null>(null);

  // Preguntas de filtrado (M15): se responden en un modal antes de postular.
  protected readonly questions = signal<PublicVacancyQuestion[]>([]);
  protected readonly applyOpen = signal(false);
  private readonly answerDrafts = signal<Record<string, ApplicationAnswerPayload>>({});

  // Denuncia de la vacante.
  protected readonly reportReasons = VACANCY_REPORT_REASONS;
  protected readonly reportOpen = signal(false);
  protected readonly reportReason = signal('');
  protected readonly reportComment = signal('');
  protected readonly reportState = signal<'idle' | 'submitting' | 'done'>('idle');
  protected readonly reportError = signal<string | null>(null);

  protected readonly answersComplete = computed(() =>
    this.questions().every((question) => {
      const draft = this.answerDrafts()[question.id];
      if (!draft) return false;
      return question.questionType === 'CLOSED'
        ? !!draft.optionId
        : !!draft.answerText?.trim();
    }),
  );

  protected readonly isNew = computed(() => {
    const v = this.vacancy();
    if (!v?.publishedAt) return false;
    const diff = Date.now() - new Date(v.publishedAt).getTime();
    return diff < 7 * 24 * 60 * 60 * 1000;
  });

  protected readonly postedAgo = computed(() => {
    const v = this.vacancy();
    const dateStr = v?.refreshedAt ?? v?.publishedAt;
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    if (days === 0) return 'Hoy';
    if (days === 1) return '1 día';
    return `${days} días`;
  });

  private readonly mapEl = viewChild<ElementRef<HTMLElement>>('mapEl');
  private map: import('leaflet').Map | undefined;

  constructor() {
    // T16: el parámetro puede traer slug (`<uuid>-<slug-del-titulo>`); el
    // UUID son siempre los primeros 36 caracteres.
    const rawParam = this.route.snapshot.paramMap.get('id') ?? '';
    const id = rawParam.slice(0, 36);

    const cached = this.transferState.get(DETAIL_STATE_KEY, null);
    if (cached && cached.id === id) {
      // Hidratación: mismos datos que renderizó el servidor, sin re-pedir.
      this.transferState.remove(DETAIL_STATE_KEY);
      this.vacancy.set(cached);
      this.state.set('loaded');
      this.applySeo(cached);
      afterNextRender(() => this.onLoadedInBrowser(cached, rawParam));
    } else if (isPlatformServer(this.platformId)) {
      // SSR: los crawlers reciben la vacante, su meta y el JSON-LD.
      this.api
        .get(id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (vacancy) => {
            this.vacancy.set(vacancy);
            this.state.set('loaded');
            this.applySeo(vacancy);
            this.transferState.set(DETAIL_STATE_KEY, vacancy);
          },
          error: () => this.state.set('error'),
        });
    } else {
      // Navegación interna en el cliente.
      afterNextRender(() => {
        this.api
          .get(id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (vacancy) => {
              this.vacancy.set(vacancy);
              this.state.set('loaded');
              this.applySeo(vacancy);
              this.onLoadedInBrowser(vacancy, rawParam);
            },
            error: () => this.state.set('error'),
          });
      });
    }

    // T17: si hay sesión de candidato, se pinta el estado de "Guardar".
    afterNextRender(() => {
      if (this.auth.currentUser()?.role === Role.CANDIDATE) {
        this.savedApi
          .ids()
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (ids) => this.saved.set(ids.includes(id)),
            error: () => undefined,
          });
      }
    });

    // El div del mapa aparece cuando hay coordenadas; ahí se monta Leaflet.
    effect(() => {
      const el = this.mapEl()?.nativeElement;
      const coords = this.mapCoords();
      if (el && coords && !this.map) {
        void this.initLeaflet(el, coords);
      }
    });

    this.destroyRef.onDestroy(() => {
      this.map?.remove();
      this.seo.setJsonLd(JSON_LD_ID, null);
    });
  }

  /** Pasos que sólo aplican en navegador: compartir, mapa, preguntas y slug. */
  private onLoadedInBrowser(vacancy: PublicVacancy, rawParam: string): void {
    this.shareLinks.set(this.buildShareLinks(vacancy));
    void this.resolveMapCoords(vacancy);
    this.loadQuestions(vacancy.id);

    // Canonicaliza la URL con el slug sin recargar (T16).
    const canonical = vacancyPath(vacancy);
    if (`/vacantes/${rawParam}` !== canonical) {
      this.location.replaceState(canonical);
    }
  }

  /** Título, meta/OG, canonical y JSON-LD JobPosting (T16). */
  private applySeo(vacancy: PublicVacancy): void {
    const companyName = vacancy.company?.businessName ?? 'Empresa confidencial';
    const place = `${vacancy.municipality}, ${this.stateName(vacancy.state)}`;
    this.seo.setPage({
      title: `${vacancy.title} — ${companyName} en ${place} | Impulso Jobs`,
      description: vacancy.description,
      canonicalPath: vacancyPath(vacancy),
      image: vacancy.company?.logoUrl ?? undefined,
    });
    this.seo.setJsonLd(JSON_LD_ID, this.jobPostingJsonLd(vacancy));
  }

  private jobPostingJsonLd(vacancy: PublicVacancy): object {
    const validThrough =
      (vacancy.applicationDeadline
        ? `${vacancy.applicationDeadline}T23:59:59-06:00`
        : null) ?? vacancy.expiresAt;

    return {
      '@context': 'https://schema.org/',
      '@type': 'JobPosting',
      title: vacancy.title,
      description: vacancy.description,
      datePosted: vacancy.publishedAt?.slice(0, 10),
      ...(validThrough && { validThrough }),
      employmentType: SCHEMA_EMPLOYMENT[vacancy.employmentType] ?? 'OTHER',
      hiringOrganization: {
        '@type': 'Organization',
        name: vacancy.company?.businessName ?? 'Empresa confidencial',
        ...(vacancy.company?.logoUrl && { logo: vacancy.company.logoUrl }),
      },
      jobLocation: {
        '@type': 'Place',
        address: {
          '@type': 'PostalAddress',
          addressLocality: vacancy.municipality,
          addressRegion: this.stateName(vacancy.state),
          addressCountry: 'MX',
        },
      },
      ...(vacancy.workMode === 'REMOTE' && {
        jobLocationType: 'TELECOMMUTE',
      }),
      ...(vacancy.salaryMin !== null || vacancy.salaryMax !== null
        ? {
            baseSalary: {
              '@type': 'MonetaryAmount',
              currency: 'MXN',
              value: {
                '@type': 'QuantitativeValue',
                ...(vacancy.salaryMin !== null && {
                  minValue: vacancy.salaryMin,
                }),
                ...(vacancy.salaryMax !== null && {
                  maxValue: vacancy.salaryMax,
                }),
                unitText: 'MONTH',
              },
            },
          }
        : {}),
      ...(vacancy.professionalAreaId && {
        occupationalCategory:
          PROFESSIONAL_AREA_NAMES.get(vacancy.professionalAreaId) ?? undefined,
      }),
      ...(vacancy.positionsCount && {
        totalJobOpenings: vacancy.positionsCount,
      }),
      identifier: {
        '@type': 'PropertyValue',
        name: 'Impulso Jobs',
        value: vacancy.id,
      },
      directApply: true,
    };
  }

  protected saveButtonClass(): string {
    const base =
      'inline-flex h-[42px] items-center gap-1.5 rounded-xl border px-3.5 text-[13px] font-bold transition-colors disabled:opacity-60 ';
    return this.saved()
      ? base + 'border-brand bg-brand-50 text-brand'
      : base + 'border-line bg-white text-body hover:bg-surface';
  }

  /** Toggle optimista de "Guardar": si la API falla, se revierte. */
  protected toggleSave(vacancyId: string): void {
    if (this.savePending()) return;
    const next = !this.saved();
    this.saved.set(next);
    this.savePending.set(true);

    const request = next
      ? this.savedApi.save(vacancyId)
      : this.savedApi.remove(vacancyId);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.savePending.set(false),
      error: () => {
        this.saved.set(!next);
        this.savePending.set(false);
      },
    });
  }

  /** Con preguntas se abre el cuestionario; sin ellas la postulación es directa. */
  protected onApplyClick(vacancyId: string): void {
    this.applyError.set(null);
    if (this.questions().length > 0) {
      this.answerDrafts.set({});
      this.applyOpen.set(true);
      return;
    }
    this.submitApplication(vacancyId);
  }

  protected submitApplication(vacancyId: string): void {
    const questions = this.questions();
    if (questions.length > 0 && !this.answersComplete()) return;

    const answers = questions.map(
      (question) => this.answerDrafts()[question.id],
    );

    this.applyState.set('submitting');
    this.applyError.set(null);
    this.applicationsApi
      .apply(vacancyId, answers.length > 0 ? { answers } : undefined)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.applyState.set('applied');
          this.applyOpen.set(false);
        },
        error: (error: unknown) => {
          const code =
            error instanceof HttpErrorResponse
              ? (error.error as ApiErrorResponse | null)?.errorCode
              : undefined;
          if (code === 'APPLICATION_ALREADY_EXISTS') {
            this.applyState.set('applied');
            this.applyOpen.set(false);
            return;
          }
          this.applyState.set('idle');
          this.applyError.set(
            code === 'APPLICATION_VACANCY_NOT_ACTIVE'
              ? 'Esta vacante ya no admite postulaciones.'
              : code === 'APPLICATION_ANSWERS_INVALID'
                ? 'Revisa tus respuestas: todas las preguntas son obligatorias.'
                : 'No pudimos enviar tu postulación. Intenta de nuevo.',
          );
        },
      });
  }

  protected draftOf(questionId: string): ApplicationAnswerPayload | undefined {
    return this.answerDrafts()[questionId];
  }

  protected setOption(questionId: string, optionId: string): void {
    this.answerDrafts.update((drafts) => ({
      ...drafts,
      [questionId]: { questionId, optionId },
    }));
  }

  protected setAnswerText(questionId: string, answerText: string): void {
    this.answerDrafts.update((drafts) => ({
      ...drafts,
      [questionId]: { questionId, answerText },
    }));
  }

  protected openReport(): void {
    this.reportReason.set('');
    this.reportComment.set('');
    this.reportError.set(null);
    this.reportState.set('idle');
    this.reportOpen.set(true);
  }

  protected closeReport(): void {
    this.reportOpen.set(false);
  }

  protected submitReport(vacancyId: string): void {
    if (!this.reportReason()) return;
    this.reportState.set('submitting');
    this.reportError.set(null);
    this.api
      .report(vacancyId, this.reportReason(), this.reportComment().trim() || undefined)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.reportState.set('done'),
        error: (error: unknown) => {
          const code =
            error instanceof HttpErrorResponse
              ? (error.error as ApiErrorResponse | null)?.errorCode
              : undefined;
          if (code === 'VACANCY_REPORT_DUPLICATED') {
            this.reportState.set('done');
            return;
          }
          this.reportState.set('idle');
          this.reportError.set('No pudimos registrar la denuncia. Intenta de nuevo.');
        },
      });
  }

  private loadQuestions(vacancyId: string): void {
    this.api
      .getQuestions(vacancyId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (questions) => this.questions.set(questions),
        error: () => this.questions.set([]),
      });
  }

  protected stateName(code: string): string {
    return STATE_NAMES.get(code) ?? code;
  }

  protected lines(text: string): readonly string[] {
    return text
      .split(/\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
  }

  protected vacancyPath(vacancy: PublicVacancy): string {
    return vacancyPath(vacancy);
  }

  protected details(vacancy: PublicVacancy): readonly DetailItem[] {
    const items: DetailItem[] = [
      {
        icon: 'calendar',
        label: 'Publicada',
        value: this.publishedLabel(vacancy),
      },
      {
        icon: 'map-pin',
        label: 'Ubicación',
        value: `${vacancy.municipality}, ${this.stateName(vacancy.state)}`,
      },
      {
        icon: 'briefcase',
        label: 'Contratación',
        value:
          EMPLOYMENT_TYPE_LABELS[vacancy.employmentType as EmploymentType] ??
          vacancy.employmentType,
      },
      {
        icon: 'globe',
        label: 'Modalidad',
        value:
          WORK_MODE_LABELS[vacancy.workMode as WorkMode] ?? vacancy.workMode,
      },
      {
        icon: 'award',
        label: 'Experiencia',
        value:
          EXPERIENCE_LEVEL_LABELS[
            vacancy.experienceLevel as ExperienceLevel
          ] ?? vacancy.experienceLevel,
      },
      { icon: 'dollar', label: 'Salario mensual', value: this.salary(vacancy) },
    ];

    // ---- Perfil de la posición (T15): sólo lo que la vacante trae. Checks
    // "truthy" a propósito: una API sin desplegar T15 manda undefined. ----
    if (vacancy.professionalAreaId) {
      const area = PROFESSIONAL_AREA_NAMES.get(vacancy.professionalAreaId);
      if (area) items.push({ icon: 'grid', label: 'Área', value: area });
    }
    if (vacancy.contractType) {
      items.push({
        icon: 'file',
        label: 'Tipo de contrato',
        value:
          CONTRACT_TYPE_LABELS[vacancy.contractType as ContractType] ??
          vacancy.contractType,
      });
    }
    if (vacancy.minEducationLevel) {
      items.push({
        icon: 'resume',
        label: 'Escolaridad mínima',
        value:
          EDUCATION_LEVEL_LABELS[
            vacancy.minEducationLevel as EducationLevel
          ] ?? vacancy.minEducationLevel,
      });
    }
    if (vacancy.positionsCount > 1) {
      items.push({
        icon: 'users',
        label: 'Plazas',
        value: `${vacancy.positionsCount} posiciones`,
      });
    }
    if (vacancy.applicationDeadline) {
      items.push({
        icon: 'clock',
        label: 'Postúlate antes del',
        value: this.dateOnlyLabel(vacancy.applicationDeadline),
      });
    }
    // Vistas consolidadas (T18): se actualizan una vez al día.
    if (vacancy.viewsCount > 0) {
      items.push({
        icon: 'eye',
        label: 'Visualizaciones',
        value: vacancy.viewsCount.toLocaleString('es-MX'),
      });
    }
    // Vigencia (T20): se comunica desde el día 1, sin relojes opacos.
    if (vacancy.expiresAt) {
      items.push({
        icon: 'history',
        label: 'Vigente hasta',
        value: new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' }).format(
          new Date(vacancy.expiresAt),
        ),
      });
    }

    return items;
  }

  /** `YYYY-MM-DD` → fecha larga es-MX, sin correr el día por zona horaria. */
  protected dateOnlyLabel(dateOnly: string): string {
    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'long',
      timeZone: 'UTC',
    }).format(new Date(`${dateOnly}T00:00:00Z`));
  }

  private publishedLabel(vacancy: PublicVacancy): string {
    if (!vacancy.publishedAt) return '—';
    return new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' }).format(
      new Date(vacancy.publishedAt),
    );
  }

  /**
   * Geocodifica municipio+estado con Nominatim (OpenStreetMap); si no hay
   * resultado cae al centro del estado, y si tampoco, el mapa no se muestra
   * (queda la ubicación textual). Solo corre en el navegador.
   */
  private async resolveMapCoords(vacancy: PublicVacancy): Promise<void> {
    const stateName = this.stateName(vacancy.state);
    const municipal = await this.geocode(
      `${vacancy.municipality}, ${stateName}, México`,
    );
    if (municipal) {
      this.mapCoords.set({ ...municipal, zoom: 12 });
      return;
    }
    const state = await this.geocode(`${stateName}, México`);
    if (state) {
      this.mapCoords.set({ ...state, zoom: 8 });
    }
  }

  private async geocode(
    query: string,
  ): Promise<{ lat: number; lng: number } | null> {
    try {
      const url =
        'https://nominatim.openstreetmap.org/search' +
        `?format=json&limit=1&countrycodes=mx&accept-language=es&q=${encodeURIComponent(query)}`;
      const response = await fetch(url);
      if (!response.ok) return null;
      const results = (await response.json()) as { lat: string; lon: string }[];
      const first = results[0];
      if (!first) return null;
      const lat = parseFloat(first.lat);
      const lng = parseFloat(first.lon);
      return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
    } catch {
      return null;
    }
  }

  private async initLeaflet(el: HTMLElement, coords: MapCoords): Promise<void> {
    // Leaflet es CJS: según el interop, el namespace puede venir en `default`.
    const mod = await import('leaflet');
    const L =
      (mod as unknown as { default?: typeof import('leaflet') }).default ?? mod;
    if (this.map) return;
    this.map = L.map(el, { scrollWheelZoom: false }).setView(
      [coords.lat, coords.lng],
      coords.zoom,
    );
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.map);
    // circleMarker: sin assets de icono (los PNG por defecto se rompen con bundlers).
    L.circleMarker([coords.lat, coords.lng], {
      radius: 9,
      color: BRAND_COLOR,
      weight: 3,
      fillColor: BRAND_COLOR,
      fillOpacity: 0.35,
    }).addTo(this.map);
  }

  private buildShareLinks(vacancy: PublicVacancy): readonly ShareLink[] {
    if (typeof window === 'undefined') return [];
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`Vacante: ${vacancy.title}`);
    return [
      {
        label: 'WhatsApp',
        href: `https://wa.me/?text=${text}%20${url}`,
        classes: 'bg-accent-green',
      },
      {
        label: 'Facebook',
        href: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
        classes: 'bg-[#1877f2]',
      },
      {
        label: 'X',
        href: `https://twitter.com/intent/tweet?url=${url}&text=${text}`,
        classes: 'bg-ink-900',
      },
      {
        label: 'LinkedIn',
        href: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
        classes: 'bg-[#0a66c2]',
      },
    ];
  }

  protected salary(vacancy: PublicVacancy): string {
    const { salaryMin, salaryMax } = vacancy;
    if (salaryMin === null && salaryMax === null) return 'A convenir';
    const format = (amount: number) =>
      new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        maximumFractionDigits: 0,
      }).format(amount);
    if (salaryMin !== null && salaryMax !== null) {
      return `${format(salaryMin)} – ${format(salaryMax)}`;
    }
    return format((salaryMin ?? salaryMax)!);
  }
}
