import { DatePipe } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '@/core/auth/auth.service';
import { ApiErrorResponse } from '@/core/models/api-response.models';
import { Role } from '@/core/models/role.enum';
import { CandidateApplicationsApi } from '@/features/candidate/data/candidate-applications.api';
import { MX_STATES } from '@/shared/catalogs/mx.catalogs';
import { IconName, IjButton, IjIcon } from '@/shared/ui';
import { PublicVacanciesApi } from '@/features/public/vacancies/data/public-vacancies.api';
import {
  EMPLOYMENT_TYPE_LABELS,
  EmploymentType,
  EXPERIENCE_LEVEL_LABELS,
  ExperienceLevel,
  PublicVacancy,
  WORK_MODE_LABELS,
  WorkMode,
} from '@/features/public/vacancies/models/public-vacancies.models';

const STATE_NAMES = new Map(MX_STATES.map((s) => [s.code, s.name]));

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

/** Detalle público de una vacante activa. Oculta la empresa si es confidencial. */
@Component({
  selector: 'app-public-vacancy-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterLink, IjButton, IjIcon],
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
                  <div class="flex flex-wrap items-center gap-2">
                    @if (data.isFeatured) {
                      <span class="rounded-md bg-brand-50 px-2.5 py-1 text-[12px] font-bold text-brand">
                        Destacada
                      </span>
                    }
                    @if (data.isUrgent) {
                      <span class="rounded-md bg-red-50 px-2.5 py-1 text-[12px] font-bold text-red-700">
                        Urgente
                      </span>
                    }
                    @if (data.isVerified) {
                      <span class="rounded-md bg-accent-blue-soft px-2.5 py-1 text-[12px] font-bold text-accent-blue">
                        Verificada
                      </span>
                    }
                  </div>

                  <div class="mt-3 flex flex-wrap items-start justify-between gap-4">
                    <h1 class="text-[28px] font-extrabold leading-tight text-ink-900">
                      {{ data.title }}
                    </h1>

                    <div class="flex-shrink-0">
                      @if (!auth.currentUser()) {
                        <a
                          ij-button
                          [routerLink]="['/auth/login']"
                          [queryParams]="{ returnUrl: '/vacantes/' + data.id }"
                          variant="primary"
                          shape="rounded"
                          size="md"
                        >
                          Postularme
                        </a>
                      } @else if (auth.currentUser()?.role === candidateRole) {
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
                            shape="rounded"
                            size="md"
                            [disabled]="applyState() === 'submitting'"
                            (click)="apply(data.id)"
                          >
                            {{ applyState() === 'submitting' ? 'Enviando…' : 'Postularme' }}
                          </button>
                        }
                      }
                    </div>
                  </div>

                  @if (applyError(); as error) {
                    <p class="mt-2 rounded-xl bg-red-50 px-4 py-2.5 text-[13px] font-semibold text-red-700">
                      {{ error }}
                    </p>
                  }

                  <h2 class="mt-6 text-base font-bold text-ink-900">Descripción</h2>
                  <p class="mt-2 whitespace-pre-line text-[14.5px] leading-relaxed text-body">
                    {{ data.description }}
                  </p>

                  @if (data.requirements) {
                    <h2 class="mt-6 text-base font-bold text-ink-900">Requisitos</h2>
                    <p class="mt-2 whitespace-pre-line text-[14.5px] leading-relaxed text-body">
                      {{ data.requirements }}
                    </p>
                  }

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

                  <p class="mt-7 border-t border-line pt-4 text-[12.5px] text-muted">
                    Publicada el {{ data.publishedAt | date: 'dd MMM yyyy' }}
                  </p>
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

  protected readonly candidateRole = Role.CANDIDATE;
  protected readonly vacancy = signal<PublicVacancy | null>(null);
  protected readonly state = signal<'loading' | 'loaded' | 'error'>('loading');
  protected readonly applyState = signal<'idle' | 'submitting' | 'applied'>('idle');
  protected readonly applyError = signal<string | null>(null);
  protected readonly shareLinks = signal<readonly ShareLink[]>([]);
  protected readonly mapCoords = signal<MapCoords | null>(null);

  private readonly mapEl = viewChild<ElementRef<HTMLElement>>('mapEl');
  private map: import('leaflet').Map | undefined;

  constructor() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    afterNextRender(() => {
      this.api
        .get(id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (vacancy) => {
            this.vacancy.set(vacancy);
            this.state.set('loaded');
            this.shareLinks.set(this.buildShareLinks(vacancy));
            void this.resolveMapCoords(vacancy);
          },
          error: () => this.state.set('error'),
        });
    });

    // El div del mapa aparece cuando hay coordenadas; ahí se monta Leaflet.
    effect(() => {
      const el = this.mapEl()?.nativeElement;
      const coords = this.mapCoords();
      if (el && coords && !this.map) {
        void this.initLeaflet(el, coords);
      }
    });

    this.destroyRef.onDestroy(() => this.map?.remove());
  }

  protected apply(vacancyId: string): void {
    this.applyState.set('submitting');
    this.applyError.set(null);
    this.applicationsApi
      .apply(vacancyId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.applyState.set('applied'),
        error: (error: unknown) => {
          const code =
            error instanceof HttpErrorResponse
              ? (error.error as ApiErrorResponse | null)?.errorCode
              : undefined;
          if (code === 'APPLICATION_ALREADY_EXISTS') {
            this.applyState.set('applied');
            return;
          }
          this.applyState.set('idle');
          this.applyError.set(
            code === 'APPLICATION_VACANCY_NOT_ACTIVE'
              ? 'Esta vacante ya no admite postulaciones.'
              : 'No pudimos enviar tu postulación. Intenta de nuevo.',
          );
        },
      });
  }

  protected stateName(code: string): string {
    return STATE_NAMES.get(code) ?? code;
  }

  protected details(vacancy: PublicVacancy): readonly DetailItem[] {
    return [
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

  private salary(vacancy: PublicVacancy): string {
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
