import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { LocaleFormatService } from '@/core/i18n/locale-format.service';
import { MX_STATES } from '@/shared/catalogs/mx.catalogs';
import { vacancyPath } from '@/shared/utils/seo';
import { IjBadge, IjIcon, IjModal } from '@/shared/ui';
import { PublicVacanciesApi } from '@/features/public/vacancies/data/public-vacancies.api';
import { PublicVacancy } from '@/features/public/vacancies/models/public-vacancies.models';

const STATE_NAMES = new Map(MX_STATES.map((s) => [s.code, s.name]));

/**
 * Modal de detalle de vacante reutilizable (T33).
 * Se abre desde "Mis postulaciones" y "Guardadas" del candidato.
 */
@Component({
  selector: 'app-vacancy-detail-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterLink, IjBadge, IjIcon, IjModal],
  styles: `
    .vacancy-banner {
      background: linear-gradient(135deg, #0f2027 0%, #203a43 40%, #2c5364 100%);
    }
  `,
  template: `
    <ij-modal
      [title]="vacancy()?.title ?? 'Vacante'"
      size="lg"
      (close)="close.emit()"
    >
      @switch (state()) {
        @case ('loading') {
          <div class="space-y-4">
            <div class="h-48 animate-pulse rounded-2xl bg-surface"></div>
            <div class="h-4 w-3/4 animate-pulse rounded bg-surface"></div>
            <div class="h-4 w-1/2 animate-pulse rounded bg-surface"></div>
            <div class="space-y-2">
              <div class="h-3 animate-pulse rounded bg-surface"></div>
              <div class="h-3 w-5/6 animate-pulse rounded bg-surface"></div>
              <div class="h-3 w-2/3 animate-pulse rounded bg-surface"></div>
            </div>
          </div>
        }
        @case ('error') {
          <div class="rounded-2xl bg-red-50 p-8 text-center text-[13.5px] text-red-700">
            No pudimos cargar los detalles de esta vacante.
          </div>
        }
        @case ('not-found') {
          <div class="rounded-2xl bg-surface p-8 text-center">
            <p class="text-[15px] font-semibold text-ink-900">
              Esta vacante ya no está disponible.
            </p>
            <p class="mt-1.5 text-[13.5px] text-muted">
              Puede que haya sido cerrada o eliminada.
            </p>
          </div>
        }
        @default {
          @if (vacancy(); as v) {
            <div class="space-y-5">
              @if (v.imageUrl) {
                <div class="relative h-[220px] overflow-hidden rounded-2xl">
                  <img
                    [src]="v.imageUrl"
                    [alt]="v.title"
                    class="h-full w-full object-cover"
                  />
                </div>
              }

              <div>
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <h3 class="text-lg font-extrabold text-ink-900">
                      {{ v.title }}
                    </h3>
                    <p class="mt-1 text-[13.5px] text-muted">
                      {{ postedAgo(v) }}
                    </p>
                  </div>
                  @if (v.isFeatured || v.isUrgent || v.isVerified) {
                    <div class="flex flex-shrink-0 flex-wrap gap-1.5">
                      @if (v.isFeatured) {
                        <ij-badge tone="brand">Destacada</ij-badge>
                      }
                      @if (v.isUrgent) {
                        <ij-badge tone="pink">Urgente</ij-badge>
                      }
                      @if (v.isVerified) {
                        <ij-badge tone="blue">Verificada</ij-badge>
                      }
                    </div>
                  }
                </div>
              </div>

              @if (v.company) {
                <div class="flex items-center gap-3">
                  <span
                    class="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-brand-50 text-sm font-extrabold text-brand-strong"
                  >
                    @if (v.company.logoUrl; as logo) {
                      <img [src]="logo" alt="" class="h-full w-full object-cover" />
                    } @else {
                      {{ companyInitials(v.company.businessName) }}
                    }
                  </span>
                  <div class="min-w-0">
                    <p class="truncate text-[14px] font-bold text-ink-900">
                      {{ v.company.businessName }}
                    </p>
                    <p class="truncate text-[12.5px] text-muted">
                      {{ v.municipality }}, {{ stateName(v.state) }}
                    </p>
                  </div>
                </div>
              }

              <div class="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-body">
                <span class="inline-flex items-center gap-1.5">
                  <ij-icon name="map-pin" [size]="15" class="text-muted" />
                  {{ v.municipality }}, {{ stateName(v.state) }}
                </span>
                <span class="inline-flex items-center gap-1.5">
                  <ij-icon name="briefcase" [size]="15" class="text-muted" />
                  {{ employmentLabel(v.employmentType) }}
                </span>
                <span class="inline-flex items-center gap-1.5">
                  <ij-icon name="globe" [size]="15" class="text-muted" />
                  {{ workModeLabel(v.workMode) }}
                </span>
                <span class="inline-flex items-center gap-1.5">
                  <ij-icon name="award" [size]="15" class="text-muted" />
                  {{ experienceLabel(v.experienceLevel) }}
                </span>
              </div>

              <div class="flex items-center justify-between rounded-xl bg-surface px-4 py-3">
                <span class="text-[15px] font-bold text-ink-900">
                  {{ salary(v) }}
                  <span class="text-[12.5px] font-semibold text-muted">/ Mensual</span>
                </span>
                @if (v.applicationDeadline) {
                  <span class="text-[12.5px] text-muted">
                    Fecha límite:
                    <span class="font-bold text-brand-strong">{{ dateOnlyLabel(v.applicationDeadline) }}</span>
                  </span>
                }
              </div>

              @if (v.description) {
                <div>
                  <h4 class="text-[15px] font-bold text-ink-900">Descripción</h4>
                  <p class="mt-2 whitespace-pre-line text-[13.5px] leading-relaxed text-body">
                    {{ v.description }}
                  </p>
                </div>
              }

              @if (v.requirements) {
                <div>
                  <h4 class="text-[15px] font-bold text-ink-900">Requisitos</h4>
                  <ul class="mt-2 space-y-2">
                    @for (line of lines(v.requirements); track $index) {
                      <li class="flex items-start gap-2.5 text-[13.5px] leading-relaxed text-body">
                        <ij-icon name="check" [size]="16" class="mt-0.5 flex-shrink-0 text-amber-600" [strokeWidth]="3" />
                        <span>{{ line }}</span>
                      </li>
                    }
                  </ul>
                </div>
              }

              @if (v.skills.length > 0) {
                <div>
                  <h4 class="text-[15px] font-bold text-ink-900">Skills</h4>
                  <div class="mt-2 flex flex-wrap gap-2">
                    @for (skill of v.skills; track skill.id) {
                      <span
                        class="rounded-full px-3 py-1 text-[12.5px] font-semibold"
                        [class]="skill.isRequired
                          ? 'bg-brand-50 text-brand-strong'
                          : 'bg-surface text-body'"
                      >
                        {{ skill.name }}
                        @if (skill.isRequired) {
                          <span class="ml-1 text-[10px] opacity-70">*req</span>
                        }
                      </span>
                    }
                  </div>
                </div>
              }

              <div class="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                <a
                  [routerLink]="detailPath(v)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-strong hover:underline"
                >
                  <ij-icon name="eye" [size]="14" />
                  Ver publicación completa
                </a>
                <p class="text-[12px] text-muted">
                  Publicada el {{ v.publishedAt | date: 'dd MMM yyyy' }}
                </p>
              </div>
            </div>
          }
        }
      }
    </ij-modal>
  `,
})
export class VacancyDetailModal {
  readonly vacancyId = input.required<string>();
  readonly close = output<void>();

  private readonly api = inject(PublicVacanciesApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly format = inject(LocaleFormatService);

  protected readonly vacancy = signal<PublicVacancy | null>(null);
  protected readonly state = signal<'loading' | 'loaded' | 'error' | 'not-found'>('loading');

  constructor() {
    effect(() => {
      const id = this.vacancyId();
      if (id) this.load(id);
    });
  }

  private load(id: string): void {
    this.state.set('loading');
    this.api
      .get(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (v) => {
          this.vacancy.set(v);
          this.state.set('loaded');
        },
        error: () => this.state.set('not-found'),
      });
  }

  protected stateName(code: string): string {
    return STATE_NAMES.get(code) ?? code;
  }

  protected employmentLabel(type: string): string {
    const labels: Record<string, string> = {
      FULL_TIME: 'Tiempo completo',
      PART_TIME: 'Medio tiempo',
      CONTRACT: 'Contrato',
      TEMPORARY: 'Temporal',
      INTERNSHIP: 'Prácticas',
    };
    return labels[type] ?? type;
  }

  protected workModeLabel(mode: string): string {
    const labels: Record<string, string> = {
      ONSITE: 'Presencial',
      REMOTE: 'Remoto',
      HYBRID: 'Híbrido',
    };
    return labels[mode] ?? mode;
  }

  protected experienceLabel(level: string): string {
    const labels: Record<string, string> = {
      WITHOUT_EXPERIENCE: 'Sin experiencia',
      ENTRY_LEVEL: 'Nivel inicial',
      MID_LEVEL: 'Nivel medio',
      SENIOR_LEVEL: 'Nivel senior',
      EXECUTIVE: 'Directivo',
    };
    return labels[level] ?? level;
  }

  protected salary(v: PublicVacancy): string {
    const { salaryMin, salaryMax } = v;
    if (salaryMin === null && salaryMax === null) return 'A definir';
    if (salaryMin !== null && salaryMax !== null) {
      return `${this.format.currency(salaryMin)} – ${this.format.currency(salaryMax)}`;
    }
    return this.format.currency((salaryMin ?? salaryMax)!);
  }

  protected postedAgo(v: PublicVacancy): string {
    const dateStr = v.refreshedAt ?? v.publishedAt;
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    if (days === 0) return 'Publicada hoy';
    if (days === 1) return 'Publicada hace 1 día';
    return `Publicada hace ${days} días`;
  }

  protected lines(text: string): readonly string[] {
    return text
      .split(/\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
  }

  protected companyInitials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');
  }

  protected detailPath(v: PublicVacancy): string {
    return vacancyPath(v);
  }

  protected dateOnlyLabel(dateOnly: string): string {
    return this.format.dateOnly(dateOnly);
  }
}
