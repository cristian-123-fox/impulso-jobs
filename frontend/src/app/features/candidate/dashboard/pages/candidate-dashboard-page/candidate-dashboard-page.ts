import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { LocaleFormatService } from '@/core/i18n/locale-format.service';
import {
  IJ_CHART_STATUS,
  IjChart,
  IjDashboardCard,
  IjIcon,
  IjKpiCard,
  areaChartOptions,
  barChartOptions,
  radialChartOptions,
} from '@/shared/ui';
import { DASHBOARD_PERIODS } from '@/shared/catalogs/dashboard-periods.catalogs';
import { CandidateDashboardApi } from '@/features/candidate/dashboard/data/dashboard.api';
import { CandidateDashboard } from '@/features/candidate/dashboard/models/dashboard.models';

/**
 * Panel de inicio del aspirante.
 *
 * Su valor no son los números —quien tiene tres postulaciones no necesita una
 * gráfica para contarlas— sino dos cosas que antes no veía en ningún sitio:
 * **qué le falta por completar** y **cuántas empresas han abierto su CV**. Por
 * eso esos dos bloques van arriba y la evolución, debajo.
 */
@Component({
  selector: 'app-candidate-dashboard-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IjChart, IjIcon, IjDashboardCard, IjKpiCard],
  template: `
    <div class="mx-auto flex max-w-[1240px] flex-col gap-5">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="text-[28px] font-extrabold leading-tight tracking-tight text-ink-900">
            {{ greeting() }}
          </h1>
          <p class="mt-1.5 text-[14px] font-medium text-muted">
            Así va tu búsqueda de empleo.
          </p>
        </div>

        <div class="flex items-center gap-1 rounded-xl border border-line bg-white p-1">
          @for (period of periods; track period.days) {
            <button
              type="button"
              [class]="periodClass(period.days)"
              [disabled]="loading()"
              (click)="setPeriod(period.days)"
            >
              {{ period.label }}
            </button>
          }
        </div>
      </div>

      @if (error()) {
        <div
          role="alert"
          class="flex items-center justify-between gap-4 rounded-xl bg-red-50 px-4 py-3 text-[13.5px] font-medium text-red-700"
        >
          No se pudo cargar tu panel.
          <button
            type="button"
            class="rounded-lg bg-white px-3 py-1.5 text-[13px] font-bold text-red-700 transition-colors hover:bg-red-100"
            (click)="load()"
          >
            Reintentar
          </button>
        </div>
      }

      @if (data(); as d) {
        <!-- ===== Indicadores ===== -->
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ij-kpi-card
            label="Postulaciones"
            [value]="d.kpis.totalApplications"
            [note]="'+' + d.kpis.newApplications + ' en el periodo'"
            icon="send"
            tone="brand"
            link="/candidato/postulaciones"
          />
          <ij-kpi-card
            label="En proceso"
            [value]="d.kpis.activeApplications"
            note="Siguen su curso"
            icon="clock"
            tone="blue"
            link="/candidato/postulaciones"
          />
          <ij-kpi-card
            label="Te han visto"
            [value]="d.profileViews.total"
            [note]="viewsNote()"
            icon="eye"
            tone="purple"
            link="/candidato/perfil"
          />
          <ij-kpi-card
            label="Guardadas"
            [value]="d.kpis.savedVacancies"
            note="Vacantes por revisar"
            icon="bookmark"
            tone="green"
            link="/candidato/guardadas"
          />
        </div>

        <!-- ===== Completitud del perfil ===== -->
        <div class="grid gap-4 lg:grid-cols-3">
          <ij-dashboard-card
            title="Tu perfil"
            [subtitle]="completionSubtitle()"
            link="/candidato/perfil"
            linkLabel="Editar"
          >
            <div class="flex h-full flex-col items-center justify-center pb-2">
              <ij-chart
                [options]="completionOptions()"
                [height]="230"
                [ariaLabel]="completionSubtitle()"
              />
              @if (d.profileCompletion.percent < 100) {
                <p class="-mt-2 px-4 text-center text-[12.5px] text-muted">
                  Un perfil completo aparece antes en las búsquedas de las
                  empresas.
                </p>
              } @else {
                <p class="-mt-2 px-4 text-center text-[12.5px] font-semibold text-accent-green-strong">
                  ¡Perfil completo!
                </p>
              }
            </div>
          </ij-dashboard-card>

          <div class="lg:col-span-2">
            <ij-dashboard-card
              title="Qué te falta"
              subtitle="Cada punto suma visibilidad"
            >
              <ul class="grid gap-1.5 px-3 pb-2 sm:grid-cols-2">
                @for (task of d.profileCompletion.tasks; track task.key) {
                  <li>
                    <a
                      [routerLink]="task.route"
                      class="flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition-colors"
                      [class]="
                        task.done
                          ? 'text-muted hover:bg-surface/60'
                          : 'font-semibold text-ink-900 hover:bg-brand-50/60'
                      "
                    >
                      <span [class]="taskIconClass(task.done)">
                        @if (task.done) {
                          <ij-icon name="check" [size]="12" [strokeWidth]="3.2" />
                        }
                      </span>
                      <span
                        class="min-w-0 flex-1 truncate text-[13px]"
                        [class.line-through]="task.done"
                      >
                        {{ task.label }}
                      </span>
                      @if (!task.done) {
                        <ij-icon
                          name="chevron-right"
                          [size]="14"
                          class="shrink-0 text-line"
                        />
                      }
                    </a>
                  </li>
                }
              </ul>
            </ij-dashboard-card>
          </div>
        </div>

        <!-- ===== Proceso + evolución ===== -->
        <div class="grid gap-4 lg:grid-cols-3">
          <div class="lg:col-span-2">
            <ij-dashboard-card
              title="Tus candidaturas"
              subtitle="En qué etapa está cada una"
              link="/candidato/postulaciones"
            >
              @if (d.kpis.totalApplications > 0) {
                <ij-chart
                  [options]="funnelOptions()"
                  [height]="300"
                  ariaLabel="Tus postulaciones por etapa"
                />
              } @else {
                <div class="flex h-[300px] flex-col items-center justify-center gap-3 px-6 text-center">
                  <span class="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-strong">
                    <ij-icon name="search" [size]="22" />
                  </span>
                  <p class="text-[13.5px] text-muted">
                    Todavía no te has postulado a ninguna vacante.
                  </p>
                  <a
                    routerLink="/vacantes"
                    class="rounded-xl bg-brand-700 px-4 py-2 text-[13.5px] font-bold text-white transition-colors hover:bg-brand-600"
                  >
                    Buscar empleo
                  </a>
                </div>
              }
            </ij-dashboard-card>
          </div>

          <ij-dashboard-card
            title="Quién te ha visto"
            subtitle="Empresas que abrieron tu CV"
            link="/candidato/configuracion"
            linkLabel="Visibilidad"
          >
            <div class="flex h-full flex-col justify-center px-4 pb-3">
              <p class="text-[34px] font-extrabold leading-none tracking-tight text-ink-900">
                {{ d.profileViews.total }}
              </p>
              <p class="mt-2 text-[13px] text-muted">
                {{
                  d.profileViews.total === 1
                    ? 'empresa ha consultado tu perfil'
                    : 'empresas han consultado tu perfil'
                }}
              </p>

              @if (d.profileViews.lastViewedAt; as last) {
                <p class="mt-4 flex items-center gap-2 rounded-xl bg-surface/70 px-3 py-2.5 text-[12.5px] text-muted">
                  <ij-icon name="clock" [size]="14" class="shrink-0" />
                  La última, {{ format.relativeDate(last) }}
                </p>
              } @else {
                <p class="mt-4 rounded-xl bg-surface/70 px-3 py-2.5 text-[12px] leading-snug text-muted">
                  Cuando una empresa abra tu hoja de vida lo verás aquí. Revisa
                  que tu perfil esté visible en tu configuración.
                </p>
              }
            </div>
          </ij-dashboard-card>
        </div>

        @if (d.kpis.totalApplications > 0) {
          <ij-dashboard-card
            title="Tu actividad"
            [subtitle]="'Postulaciones enviadas en los últimos ' + d.periodDays + ' días'"
          >
            <ij-chart
              [options]="trendOptions()"
              [height]="260"
              ariaLabel="Postulaciones enviadas por día"
            />
          </ij-dashboard-card>
        }
      } @else if (!error()) {
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          @for (slot of [1, 2, 3, 4]; track slot) {
            <div class="h-[92px] animate-pulse rounded-2xl border border-line bg-white"></div>
          }
        </div>
        <div class="grid gap-4 lg:grid-cols-3">
          <div class="h-[320px] animate-pulse rounded-2xl border border-line bg-white"></div>
          <div class="h-[320px] animate-pulse rounded-2xl border border-line bg-white lg:col-span-2"></div>
        </div>
      }
    </div>
  `,
})
export class CandidateDashboardPage {
  private readonly api = inject(CandidateDashboardApi);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly format = inject(LocaleFormatService);

  protected readonly periods = DASHBOARD_PERIODS;
  protected readonly days = signal<number>(30);
  protected readonly data = signal<CandidateDashboard | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal(false);

  protected readonly greeting = computed(() => {
    const name = this.data()?.firstName?.trim();
    return name ? `Hola, ${name}` : 'Tu panel';
  });

  protected readonly completionSubtitle = computed(() => {
    const completion = this.data()?.profileCompletion;
    if (!completion) return '';
    return `${completion.completed} de ${completion.total} secciones completas`;
  });

  protected readonly viewsNote = computed(() => {
    const views = this.data()?.profileViews;
    if (!views || views.recent === 0) return 'Empresas que vieron tu CV';
    return `+${views.recent} en el periodo`;
  });

  protected readonly completionOptions = computed(() => {
    const percent = this.data()?.profileCompletion.percent ?? 0;
    return radialChartOptions({
      percent,
      label: 'Completado',
      // Verde al llegar al 100 %: es un logro, no un indicador de marca más.
      color: percent === 100 ? IJ_CHART_STATUS.active : IJ_CHART_STATUS.brand,
      height: 230,
    });
  });

  protected readonly funnelOptions = computed(() => {
    const stages = this.data()?.applicationsByStatus ?? [];
    return barChartOptions({
      name: 'Candidaturas',
      categories: stages.map((stage) => stage.name),
      values: stages.map((stage) => stage.count),
      horizontal: true,
      height: 300,
    });
  });

  protected readonly trendOptions = computed(() => {
    const points = this.data()?.applicationsTrend ?? [];
    return areaChartOptions({
      name: 'Postulaciones',
      categories: points.map((point) => this.format.dateOnly(point.date)),
      values: points.map((point) => point.count),
      height: 260,
    });
  });

  constructor() {
    this.load();
  }

  protected setPeriod(days: number): void {
    if (days === this.days()) return;
    this.days.set(days);
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.api
      .get(this.days())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.data.set(data);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.error.set(true);
        },
      });
  }

  protected periodClass(days: number): string {
    const base =
      'rounded-lg px-3 py-1.5 text-[12.5px] font-bold transition-colors disabled:opacity-60';
    return days === this.days()
      ? `${base} bg-brand-50 text-brand-strong`
      : `${base} text-muted hover:bg-surface hover:text-ink-900`;
  }

  protected taskIconClass(done: boolean): string {
    const base =
      'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-white';
    return done
      ? `${base} bg-accent-green-strong`
      : `${base} border-2 border-line bg-white`;
  }
}
