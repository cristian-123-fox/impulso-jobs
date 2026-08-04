import { DatePipe } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MX_STATES } from '@/shared/catalogs/mx.catalogs';
import { IjButton, IjIcon } from '@/shared/ui';
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

/** Detalle público de una vacante activa. Oculta la empresa si es confidencial. */
@Component({
  selector: 'app-public-vacancy-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterLink, IjButton, IjIcon],
  template: `
    <section class="px-6 py-10 lg:px-[60px]">
      <div class="mx-auto max-w-[900px]">
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

                <h1 class="mt-3 text-[28px] font-extrabold leading-tight text-ink-900">
                  {{ data.title }}
                </h1>

                <div class="mt-3 flex items-center gap-3">
                  <span
                    class="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-50 text-sm font-bold text-brand"
                  >
                    @if (data.company?.logoUrl; as logo) {
                      <img [src]="logo" alt="" class="h-full w-full object-cover" />
                    } @else {
                      ··
                    }
                  </span>
                  <div>
                    <div class="text-[14.5px] font-bold text-ink-900">
                      {{ data.company?.businessName ?? 'Empresa confidencial' }}
                    </div>
                    @if (data.isConfidential) {
                      <div class="text-[12.5px] text-muted">
                        La empresa se dará a conocer durante el proceso.
                      </div>
                    } @else if (data.company?.economicSector) {
                      <div class="text-[12.5px] text-muted">
                        {{ data.company?.economicSector }}
                      </div>
                    }
                  </div>
                </div>

                <dl class="mt-6 grid gap-x-6 gap-y-4 border-t border-line pt-5 sm:grid-cols-2 lg:grid-cols-3">
                  @for (item of details(data); track item.label) {
                    <div>
                      <dt class="text-[11.5px] font-bold uppercase tracking-wide text-muted">
                        {{ item.label }}
                      </dt>
                      <dd class="mt-1 text-[13.5px] text-body">{{ item.value }}</dd>
                    </div>
                  }
                </dl>

                <h2 class="mt-7 text-base font-bold text-ink-900">Descripción</h2>
                <p class="mt-2 whitespace-pre-line text-[14.5px] leading-relaxed text-body">
                  {{ data.description }}
                </p>

                @if (data.requirements) {
                  <h2 class="mt-6 text-base font-bold text-ink-900">Requisitos</h2>
                  <p class="mt-2 whitespace-pre-line text-[14.5px] leading-relaxed text-body">
                    {{ data.requirements }}
                  </p>
                }

                <p class="mt-7 border-t border-line pt-4 text-[12.5px] text-muted">
                  Publicada el {{ data.publishedAt | date: 'dd MMM yyyy' }}
                </p>
              </article>
            }
          }
        }
      </div>
    </section>
  `,
})
export class PublicVacancyDetailPage {
  private readonly api = inject(PublicVacanciesApi);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly vacancy = signal<PublicVacancy | null>(null);
  protected readonly state = signal<'loading' | 'loaded' | 'error'>('loading');

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
          },
          error: () => this.state.set('error'),
        });
    });
  }

  protected details(
    vacancy: PublicVacancy,
  ): readonly { label: string; value: string }[] {
    return [
      {
        label: 'Ubicación',
        value: `${vacancy.municipality}, ${STATE_NAMES.get(vacancy.state) ?? vacancy.state}`,
      },
      {
        label: 'Contratación',
        value:
          EMPLOYMENT_TYPE_LABELS[vacancy.employmentType as EmploymentType] ??
          vacancy.employmentType,
      },
      {
        label: 'Modalidad',
        value:
          WORK_MODE_LABELS[vacancy.workMode as WorkMode] ?? vacancy.workMode,
      },
      {
        label: 'Experiencia',
        value:
          EXPERIENCE_LEVEL_LABELS[
            vacancy.experienceLevel as ExperienceLevel
          ] ?? vacancy.experienceLevel,
      },
      { label: 'Salario mensual', value: this.salary(vacancy) },
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
