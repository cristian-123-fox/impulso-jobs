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
  IJ_CHART_PALETTE,
  IJ_CHART_STATUS,
  IjChart,
  IjDashboardCard,
  IjIcon,
  IjKpiCard,
  areaChartOptions,
  barChartOptions,
  donutChartOptions,
  multiAreaChartOptions,
} from '@/shared/ui';
import { AdminDashboardApi } from '@/features/admin/dashboard/data/dashboard.api';
import { AdminDashboard } from '@/features/admin/dashboard/models/dashboard.models';
import { DASHBOARD_PERIODS } from '@/shared/catalogs/dashboard-periods.catalogs';

const VACANCY_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Activas',
  PAUSED: 'Pausadas',
  CLOSED: 'Cerradas',
};

const VACANCY_STATUS_COLORS: Record<string, string> = {
  ACTIVE: IJ_CHART_STATUS.active,
  PAUSED: IJ_CHART_STATUS.paused,
  CLOSED: IJ_CHART_STATUS.closed,
};

/**
 * Panel del back-office: el pulso de la plataforma en una pantalla.
 *
 * Responde tres preguntas de gobierno —¿está creciendo?, ¿de dónde viene el
 * dinero?, ¿hay algo que atender?— y deja lo operativo (listados, filtros) a
 * las secciones, que es donde se trabaja.
 */
@Component({
  selector: 'app-admin-dashboard-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IjChart, IjIcon, IjDashboardCard, IjKpiCard],
  template: `
    <div class="mx-auto flex max-w-[1240px] flex-col gap-5">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="text-[28px] font-extrabold leading-tight tracking-tight text-ink-900">
            Panel de la plataforma
          </h1>
          <p class="mt-1.5 text-[14px] font-medium text-muted">
            @if (data(); as d) {
              Actividad de los últimos {{ d.periodDays }} días.
            } @else {
              Cargando la actividad reciente…
            }
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
          No se pudo cargar el panel.
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
            label="Cuentas"
            [value]="format.number(d.kpis.totalUsers)"
            [note]="'+' + d.kpis.newUsers + ' en el periodo'"
            icon="users"
            tone="brand"
            link="/admin/usuarios"
          />
          <ij-kpi-card
            label="Empresas"
            [value]="format.number(d.kpis.totalCompanies)"
            [note]="d.kpis.activeVacancies + ' vacantes activas'"
            icon="building"
            tone="blue"
            link="/admin/empresas"
          />
          <ij-kpi-card
            label="Postulaciones"
            [value]="format.number(d.kpis.totalApplications)"
            note="Histórico de la plataforma"
            icon="file"
            tone="purple"
            link="/admin/empresas"
          />
          <ij-kpi-card
            label="Denuncias"
            [value]="d.kpis.pendingReports"
            [note]="
              d.kpis.pendingReports > 0 ? 'Pendientes de revisar' : 'Nada pendiente'
            "
            icon="alert-triangle"
            [tone]="d.kpis.pendingReports > 0 ? 'danger' : 'green'"
            link="/admin/denuncias"
          />
        </div>

        <!-- ===== Crecimiento ===== -->
        <div class="grid gap-4 lg:grid-cols-3">
          <div class="lg:col-span-2">
            <ij-dashboard-card
              title="Altas de cuentas"
              subtitle="Aspirantes y empresas, día a día"
              link="/admin/usuarios"
            >
              <ij-chart
                [options]="signupsOptions()"
                [height]="300"
                ariaLabel="Altas de aspirantes y empresas por día"
              />
            </ij-dashboard-card>
          </div>

          <ij-dashboard-card
            title="Reparto de cuentas"
            subtitle="Por tipo de usuario"
            link="/admin/usuarios"
          >
            <ij-chart
              [options]="usersDonutOptions()"
              [height]="300"
              ariaLabel="Cuentas por tipo de usuario"
            />
          </ij-dashboard-card>
        </div>

        <!-- ===== Ingresos + vacantes ===== -->
        <div class="grid gap-4 lg:grid-cols-3">
          <ij-dashboard-card
            title="Ingresos del periodo"
            subtitle="Órdenes cobradas"
            link="/admin/planes"
            linkLabel="Planes"
          >
            <div class="flex h-full flex-col justify-center px-3 pb-3">
              <p class="text-[32px] font-extrabold leading-none tracking-tight text-ink-900">
                {{ format.currency(d.revenue.amount) }}
              </p>
              <p class="mt-2 text-[13px] text-muted">
                {{ d.revenue.orders }}
                {{ d.revenue.orders === 1 ? 'orden cobrada' : 'órdenes cobradas' }}
                en {{ d.periodDays }} días
              </p>
              <p class="mt-4 flex items-start gap-2 rounded-xl bg-surface/70 px-3 py-2.5 text-[12px] leading-snug text-muted">
                <ij-icon name="alert-triangle" [size]="14" class="mt-0.5 shrink-0" />
                Sólo cuenta lo marcado como pagado, por fecha de cobro.
              </p>
            </div>
          </ij-dashboard-card>

          <div class="lg:col-span-2">
            <ij-dashboard-card
              title="Postulaciones en la plataforma"
              subtitle="Actividad diaria de los aspirantes"
            >
              <ij-chart
                [options]="applicationsOptions()"
                [height]="280"
                ariaLabel="Postulaciones por día en la plataforma"
              />
            </ij-dashboard-card>
          </div>
        </div>

        <!-- ===== Áreas + entidades ===== -->
        <div class="grid gap-4 lg:grid-cols-2">
          <ij-dashboard-card
            title="Áreas con más oferta"
            subtitle="Vacantes publicadas por área profesional"
          >
            @if (d.topAreas.length > 0) {
              <ij-chart
                [options]="areasOptions()"
                [height]="280"
                ariaLabel="Vacantes por área profesional"
              />
            } @else {
              <p class="flex h-[280px] items-center justify-center text-[13.5px] text-muted">
                Todavía no hay vacantes publicadas.
              </p>
            }
          </ij-dashboard-card>

          <ij-dashboard-card
            title="Dónde están las empresas"
            subtitle="Entidades con más empresas registradas"
            link="/admin/empresas"
          >
            @if (d.companiesByState.length > 0) {
              <ij-chart
                [options]="statesOptions()"
                [height]="280"
                ariaLabel="Empresas por entidad federativa"
              />
            } @else {
              <p class="flex h-[280px] items-center justify-center text-[13.5px] text-muted">
                Todavía no hay empresas registradas.
              </p>
            }
          </ij-dashboard-card>
        </div>

        <!-- ===== Vacantes por estado + últimas empresas ===== -->
        <div class="grid gap-4 lg:grid-cols-3">
          <ij-dashboard-card title="Vacantes" subtitle="Reparto por estado">
            @if (totalVacancies() > 0) {
              <ij-chart
                [options]="vacancyDonutOptions()"
                [height]="280"
                ariaLabel="Vacantes por estado"
              />
            } @else {
              <p class="flex h-[280px] items-center justify-center text-[13.5px] text-muted">
                Sin vacantes.
              </p>
            }
          </ij-dashboard-card>

          <div class="lg:col-span-2">
            <ij-dashboard-card
              title="Últimas empresas registradas"
              subtitle="Las cinco más recientes"
              link="/admin/empresas"
            >
              <div class="px-3 pb-1">
                @if (d.recentCompanies.length > 0) {
                  <ul class="flex flex-col divide-y divide-line">
                    @for (company of d.recentCompanies; track company.id) {
                      <li>
                        <a
                          [routerLink]="['/admin/empresas', company.id]"
                          class="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-surface/60"
                        >
                          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-blue-soft text-accent-blue-strong">
                            <ij-icon name="building" [size]="17" />
                          </span>
                          <span class="min-w-0 flex-1">
                            <span class="block truncate text-[13.5px] font-semibold text-ink-900">
                              {{ company.businessName }}
                            </span>
                            <span class="block truncate text-[12.5px] text-muted">
                              {{ company.state }}
                            </span>
                          </span>
                          <span class="shrink-0 text-[12px] text-muted">
                            {{ format.relativeDate(company.createdAt) }}
                          </span>
                        </a>
                      </li>
                    }
                  </ul>
                } @else {
                  <p class="py-10 text-center text-[13px] text-muted">
                    Todavía no hay empresas registradas.
                  </p>
                }
              </div>
            </ij-dashboard-card>
          </div>
        </div>
      } @else if (!error()) {
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          @for (slot of [1, 2, 3, 4]; track slot) {
            <div class="h-[92px] animate-pulse rounded-2xl border border-line bg-white"></div>
          }
        </div>
        <div class="grid gap-4 lg:grid-cols-3">
          <div class="h-[360px] animate-pulse rounded-2xl border border-line bg-white lg:col-span-2"></div>
          <div class="h-[360px] animate-pulse rounded-2xl border border-line bg-white"></div>
        </div>
      }
    </div>
  `,
})
export class AdminDashboardPage {
  private readonly api = inject(AdminDashboardApi);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly format = inject(LocaleFormatService);

  protected readonly periods = DASHBOARD_PERIODS;
  protected readonly days = signal<number>(30);
  protected readonly data = signal<AdminDashboard | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal(false);

  protected readonly totalVacancies = computed(() =>
    (this.data()?.vacanciesByStatus ?? []).reduce(
      (total, slice) => total + slice.count,
      0,
    ),
  );

  /** Dos series sobre el mismo eje, con leyenda: identidad por color + texto. */
  protected readonly signupsOptions = computed(() => {
    const points = this.data()?.signupsTrend ?? [];
    return multiAreaChartOptions(
      points.map((point) => this.format.dateOnly(point.date)),
      [
        { name: 'Aspirantes', values: points.map((p) => p.candidates) },
        { name: 'Empresas', values: points.map((p) => p.employers) },
      ],
      300,
    );
  });

  protected readonly applicationsOptions = computed(() => {
    const points = this.data()?.applicationsTrend ?? [];
    return areaChartOptions({
      name: 'Postulaciones',
      categories: points.map((point) => this.format.dateOnly(point.date)),
      values: points.map((point) => point.count),
      height: 280,
    });
  });

  protected readonly usersDonutOptions = computed(() => {
    const slices = this.data()?.usersByRole ?? [];
    return donutChartOptions({
      labels: slices.map((slice) => slice.label),
      values: slices.map((slice) => slice.count),
      colors: [...IJ_CHART_PALETTE],
      totalLabel: 'Cuentas',
    });
  });

  protected readonly vacancyDonutOptions = computed(() => {
    const slices = this.data()?.vacanciesByStatus ?? [];
    return donutChartOptions({
      labels: slices.map((s) => VACANCY_STATUS_LABELS[s.status] ?? s.status),
      values: slices.map((s) => s.count),
      colors: slices.map(
        (s) => VACANCY_STATUS_COLORS[s.status] ?? IJ_CHART_STATUS.brand,
      ),
      totalLabel: 'Vacantes',
      height: 280,
    });
  });

  protected readonly areasOptions = computed(() => {
    const rows = this.data()?.topAreas ?? [];
    return barChartOptions({
      name: 'Vacantes',
      categories: rows.map((row) => truncate(row.label, 30)),
      values: rows.map((row) => row.count),
      horizontal: true,
      height: 280,
    });
  });

  protected readonly statesOptions = computed(() => {
    const rows = this.data()?.companiesByState ?? [];
    return barChartOptions({
      name: 'Empresas',
      categories: rows.map((row) => truncate(row.label, 30)),
      values: rows.map((row) => row.count),
      horizontal: true,
      height: 280,
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
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
