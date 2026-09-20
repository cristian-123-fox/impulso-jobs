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
import { AuthService } from '@/core/auth/auth.service';
import { LocaleFormatService } from '@/core/i18n/locale-format.service';
import {
  IJ_CHART_STATUS,
  IjAvatar,
  IjChart,
  IjDashboardCard,
  IjIcon,
  IjKpiCard,
  areaChartOptions,
  barChartOptions,
  donutChartOptions,
  radialChartOptions,
} from '@/shared/ui';
import { ApplicationsApi } from '@/features/company/applications/data/applications.api';
import { CompanyApplication } from '@/features/company/applications/models/applications.models';
import { CompanyDashboardApi } from '@/features/company/dashboard/data/dashboard.api';
import { CompanyDashboard } from '@/features/company/dashboard/models/dashboard.models';
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
 * Panel de inicio de la empresa: lo primero que ve al entrar a `/empresa`.
 *
 * Dos peticiones y ninguna más: `GET /company/dashboard` trae todos los
 * agregados, y el listado de postulaciones aporta la actividad reciente —que ya
 * sabe resolver el nombre del aspirante, algo que no tiene sentido duplicar en
 * el endpoint de métricas.
 *
 * El selector de periodo sólo recarga las métricas; la actividad reciente no
 * depende de él.
 */
@Component({
  selector: 'app-company-dashboard-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    IjAvatar,
    IjChart,
    IjIcon,
    IjDashboardCard,
    IjKpiCard,
  ],
  template: `
    <div class="mx-auto flex max-w-[1240px] flex-col gap-5">
      <!-- ===== Cabecera ===== -->
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="text-[28px] font-extrabold leading-tight tracking-tight text-ink-900">
            {{ greeting() }}
          </h1>
          <p class="mt-1.5 text-[14px] font-medium text-muted">
            Así va tu reclutamiento
            @if (data(); as d) {
              en los últimos {{ d.periodDays }} días.
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
            label="Vacantes activas"
            [value]="d.kpis.activeVacancies"
            [note]="'de ' + d.kpis.totalVacancies + ' publicadas'"
            icon="briefcase"
            tone="brand"
            link="/empresa/vacantes"
          />
          <ij-kpi-card
            label="Postulaciones"
            [value]="format.number(d.kpis.totalApplications)"
            [note]="'+' + d.kpis.newApplications + ' en el periodo'"
            icon="file"
            tone="blue"
            link="/empresa/postulaciones"
          />
          <ij-kpi-card
            label="Sin revisar"
            [value]="d.kpis.unreadApplications"
            [note]="
              d.kpis.unreadApplications > 0
                ? 'Esperan tu respuesta'
                : 'Todo al día'
            "
            icon="bell"
            tone="purple"
            link="/empresa/postulaciones"
          />
          <ij-kpi-card
            label="Vistas"
            [value]="format.number(d.kpis.totalViews)"
            note="Se actualizan una vez al día"
            icon="eye"
            tone="green"
            link="/empresa/vacantes"
          />
        </div>

        <!-- ===== Evolución + reparto de vacantes ===== -->
        <div class="grid gap-4 lg:grid-cols-3">
          <div class="lg:col-span-2">
            <ij-dashboard-card
              title="Postulaciones recibidas"
              [subtitle]="trendSubtitle()"
              link="/empresa/postulaciones"
            >
              <ij-chart
                [options]="trendOptions()"
                [height]="300"
                ariaLabel="Postulaciones recibidas por día"
              />
            </ij-dashboard-card>
          </div>

          <ij-dashboard-card
            title="Tus vacantes"
            subtitle="Reparto por estado"
            link="/empresa/vacantes"
          >
            @if (d.kpis.totalVacancies > 0) {
              <ij-chart
                [options]="vacancyDonutOptions()"
                [height]="300"
                ariaLabel="Vacantes por estado"
              />
            } @else {
              <div class="flex h-[300px] flex-col items-center justify-center gap-3 px-6 text-center">
                <span class="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-strong">
                  <ij-icon name="briefcase" [size]="22" />
                </span>
                <p class="text-[13.5px] text-muted">
                  Todavía no has publicado ninguna vacante.
                </p>
                <a
                  routerLink="/empresa/vacantes/nueva"
                  class="rounded-xl bg-brand-700 px-4 py-2 text-[13.5px] font-bold text-white transition-colors hover:bg-brand-600"
                >
                  Publicar la primera
                </a>
              </div>
            }
          </ij-dashboard-card>
        </div>

        <!-- ===== Embudo + cupo + plan ===== -->
        <div class="grid gap-4 lg:grid-cols-3">
          <div class="lg:col-span-2">
            <ij-dashboard-card
              title="Proceso de selección"
              subtitle="En qué etapa está cada candidatura"
              link="/empresa/postulaciones"
            >
              @if (d.kpis.totalApplications > 0) {
                <ij-chart
                  [options]="funnelOptions()"
                  [height]="300"
                  ariaLabel="Postulaciones por etapa del proceso"
                />
              } @else {
                <p class="flex h-[300px] items-center justify-center px-6 text-center text-[13.5px] text-muted">
                  Cuando lleguen postulaciones verás aquí en qué etapa está cada una.
                </p>
              }
            </ij-dashboard-card>
          </div>

          <ij-dashboard-card
            title="Base de talento"
            subtitle="Cupo de consultas de tu plan"
            link="/empresa/candidatos"
            linkLabel="Buscar"
          >
            <div class="flex h-full flex-col items-center justify-center gap-2 pb-2">
              @if (d.talentQuota.unlimited) {
                <span class="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-green-soft text-accent-green-strong">
                  <ij-icon name="flash" [size]="28" />
                </span>
                <p class="text-[17px] font-extrabold text-ink-900">Ilimitado</p>
                <p class="text-[12.5px] text-muted">Tu plan no limita las consultas.</p>
              } @else {
                <ij-chart
                  [options]="quotaOptions()"
                  [height]="230"
                  [ariaLabel]="quotaAriaLabel()"
                />
                <p class="-mt-2 text-center text-[12.5px] text-muted">
                  Te quedan
                  <span class="font-bold text-ink-900">{{ d.talentQuota.remainingVisits }}</span>
                  de {{ d.talentQuota.totalVisits }} consultas
                </p>
              }
            </div>
          </ij-dashboard-card>
        </div>

        <!-- ===== Top vacantes + por vencer + actividad ===== -->
        <div class="grid gap-4 lg:grid-cols-3">
          <div class="lg:col-span-2">
            <ij-dashboard-card
              title="Vacantes con más respuesta"
              subtitle="Las cinco que más candidaturas acumulan"
              link="/empresa/vacantes"
            >
              @if (d.topVacancies.length > 0) {
                <ij-chart
                  [options]="topVacanciesOptions()"
                  [height]="280"
                  ariaLabel="Vacantes con más postulaciones"
                />
              } @else {
                <p class="flex h-[280px] items-center justify-center px-6 text-center text-[13.5px] text-muted">
                  Aún no hay datos suficientes.
                </p>
              }
            </ij-dashboard-card>
          </div>

          <ij-dashboard-card
            title="Vencen pronto"
            subtitle="Vacantes activas por caducar"
            link="/empresa/vacantes"
          >
            <div class="px-3 pb-1">
              @if (d.expiringVacancies.length > 0) {
                <ul class="flex flex-col gap-2">
                  @for (vacancy of d.expiringVacancies; track vacancy.id) {
                    <li>
                      <a
                        [routerLink]="['/empresa/vacantes', vacancy.id, 'editar']"
                        class="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5 transition-colors hover:border-brand/40 hover:bg-surface/60"
                      >
                        <span [class]="deadlineClass(vacancy.daysLeft)">
                          {{ vacancy.daysLeft }}
                          <span class="block text-[9.5px] font-bold uppercase leading-none">
                            {{ vacancy.daysLeft === 1 ? 'día' : 'días' }}
                          </span>
                        </span>
                        <span class="min-w-0 flex-1">
                          <span class="block truncate text-[13.5px] font-semibold text-ink-900">
                            {{ vacancy.title }}
                          </span>
                          <span class="block text-[12px] text-muted">
                            {{ vacancy.applications }}
                            {{ vacancy.applications === 1 ? 'postulación' : 'postulaciones' }}
                          </span>
                        </span>
                      </a>
                    </li>
                  }
                </ul>
              } @else {
                <p class="py-10 text-center text-[13px] text-muted">
                  Ninguna vacante vence en los próximos 14 días.
                </p>
              }
            </div>
          </ij-dashboard-card>
        </div>

        <!-- ===== Actividad reciente + plan ===== -->
        <div class="grid gap-4 lg:grid-cols-3">
          <div class="lg:col-span-2">
            <ij-dashboard-card
              title="Últimas postulaciones"
              subtitle="Lo más reciente que ha llegado"
              link="/empresa/postulaciones"
            >
              <div class="px-3 pb-1">
                @if (recent().length > 0) {
                  <ul class="flex flex-col divide-y divide-line">
                    @for (item of recent(); track item.id) {
                      <li>
                        <a
                          [routerLink]="['/empresa/postulaciones']"
                          class="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-surface/60"
                        >
                          <ij-avatar
                            class="h-9 w-9 rounded-full text-[12px]"
                            [name]="candidateName(item)"
                            [src]="item.candidate?.profilePhotoUrl ?? ''"
                          />
                          <span class="min-w-0 flex-1">
                            <span class="block truncate text-[13.5px] font-semibold text-ink-900">
                              {{ candidateName(item) }}
                            </span>
                            <span class="block truncate text-[12.5px] text-muted">
                              {{ item.vacancy?.title ?? 'Vacante eliminada' }}
                            </span>
                          </span>
                          @if (!item.readAt) {
                            <span class="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[10.5px] font-extrabold uppercase text-brand-strong">
                              Nueva
                            </span>
                          }
                          <span class="shrink-0 text-[12px] text-muted">
                            {{ format.relativeDate(item.appliedAt) }}
                          </span>
                        </a>
                      </li>
                    }
                  </ul>
                } @else {
                  <p class="py-10 text-center text-[13px] text-muted">
                    Todavía no has recibido postulaciones.
                  </p>
                }
              </div>
            </ij-dashboard-card>
          </div>

          <ij-dashboard-card
            title="Tu plan"
            [subtitle]="d.plan ? 'Suscripción vigente' : 'Sin plan contratado'"
            link="/empresa/promociones"
            [linkLabel]="d.plan ? 'Gestionar' : 'Ver planes'"
          >
            <div class="px-3 pb-2">
              @if (d.plan; as plan) {
                <div class="rounded-xl border border-line px-4 py-3.5">
                  <p class="text-[17px] font-extrabold text-ink-900">
                    {{ plan.name ?? 'Plan activo' }}
                  </p>
                  @if (plan.daysLeft !== null) {
                    <p class="mt-1 text-[13px] text-muted">
                      @if (plan.daysLeft > 0) {
                        Vence en
                        <span [class]="planDaysClass(plan.daysLeft)">
                          {{ plan.daysLeft }} días
                        </span>
                      } @else {
                        <span class="font-bold text-red-600">Vencido</span>
                      }
                    </p>
                  }
                  @if (plan.endsAt) {
                    <p class="mt-2 text-[12.5px] text-muted">
                      Hasta el {{ format.shortDate(plan.endsAt) }}
                    </p>
                  }
                  <p class="mt-3 flex items-center gap-1.5 text-[12.5px] font-semibold" [class]="plan.autoRenew ? 'text-accent-green-strong' : 'text-muted'">
                    <ij-icon [name]="plan.autoRenew ? 'check' : 'pause'" [size]="14" [strokeWidth]="2.4" />
                    {{ plan.autoRenew ? 'Se renueva automáticamente' : 'No se renueva solo' }}
                  </p>
                </div>
              } @else {
                <div class="rounded-xl border border-dashed border-line px-4 py-6 text-center">
                  <p class="text-[13.5px] text-muted">
                    Contrata un plan para destacar tus vacantes y consultar la base
                    de talento.
                  </p>
                  <a
                    routerLink="/empresa/promociones"
                    class="mt-3 inline-block rounded-xl bg-brand-700 px-4 py-2 text-[13.5px] font-bold text-white transition-colors hover:bg-brand-600"
                  >
                    Ver planes
                  </a>
                </div>
              }
            </div>
          </ij-dashboard-card>
        </div>
      } @else if (!error()) {
        <!-- Esqueleto con la misma retícula, para que no salte al cargar. -->
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
export class CompanyDashboardPage {
  private readonly api = inject(CompanyDashboardApi);
  private readonly applicationsApi = inject(ApplicationsApi);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly format = inject(LocaleFormatService);

  protected readonly periods = DASHBOARD_PERIODS;
  protected readonly days = signal<number>(30);
  protected readonly data = signal<CompanyDashboard | null>(null);
  protected readonly recent = signal<CompanyApplication[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal(false);

  protected readonly greeting = computed(() => {
    // `displayName` de un EMPLOYER es el nombre comercial (`GET /auth/me`).
    const name = this.auth.currentUser()?.displayName?.trim();
    return name ? `Hola, ${name}` : 'Tu panel';
  });

  protected readonly trendSubtitle = computed(() => {
    const d = this.data();
    if (!d) return '';
    return `${d.kpis.newApplications} en los últimos ${d.periodDays} días`;
  });

  /** Serie temporal: una sola línea, sin leyenda (el título ya la nombra). */
  protected readonly trendOptions = computed(() => {
    const points = this.data()?.applicationsTrend ?? [];
    return areaChartOptions({
      name: 'Postulaciones',
      categories: points.map((point) => this.format.dateOnly(point.date)),
      values: points.map((point) => point.count),
    });
  });

  protected readonly vacancyDonutOptions = computed(() => {
    const slices = this.data()?.vacanciesByStatus ?? [];
    return donutChartOptions({
      labels: slices.map((s) => VACANCY_STATUS_LABELS[s.status] ?? s.status),
      values: slices.map((s) => s.count),
      colors: slices.map((s) => VACANCY_STATUS_COLORS[s.status] ?? IJ_CHART_STATUS.brand),
      totalLabel: 'Vacantes',
    });
  });

  /**
   * Embudo en barras horizontales y no en dona: son siete etapas con un orden
   * propio, y en una dona las porciones pequeñas dejan de compararse.
   */
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

  protected readonly topVacanciesOptions = computed(() => {
    const rows = this.data()?.topVacancies ?? [];
    return barChartOptions({
      name: 'Postulaciones',
      categories: rows.map((row) => truncate(row.title, 34)),
      values: rows.map((row) => row.applications),
      horizontal: true,
      height: 280,
    });
  });

  protected readonly quotaOptions = computed(() => {
    const quota = this.data()?.talentQuota;
    const total = quota?.totalVisits ?? 0;
    const used = quota?.usedVisits ?? 0;
    const percent = total > 0 ? (used / total) * 100 : 0;
    return radialChartOptions({
      percent,
      label: 'Consumido',
      // Rojo cuando queda poco: es un aviso, no una serie más.
      color: percent >= 80 ? IJ_CHART_STATUS.danger : IJ_CHART_STATUS.brand,
      height: 230,
    });
  });

  protected readonly quotaAriaLabel = computed(() => {
    const quota = this.data()?.talentQuota;
    if (!quota) return 'Cupo de la base de talento';
    return `Has usado ${quota.usedVisits} de ${quota.totalVisits} consultas`;
  });

  constructor() {
    this.load();
    this.loadRecent();
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

  private loadRecent(): void {
    this.applicationsApi
      .list({ page: 1, limit: 5 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => this.recent.set(page.items),
        // La actividad reciente es accesoria: si falla, el panel sigue en pie.
        error: () => this.recent.set([]),
      });
  }

  protected candidateName(item: CompanyApplication): string {
    const candidate = item.candidate;
    if (!candidate) return 'Candidato';
    return `${candidate.firstName} ${candidate.lastName}`.trim();
  }

  protected periodClass(days: number): string {
    const base =
      'rounded-lg px-3 py-1.5 text-[12.5px] font-bold transition-colors disabled:opacity-60';
    return days === this.days()
      ? `${base} bg-brand-50 text-brand-strong`
      : `${base} text-muted hover:bg-surface hover:text-ink-900`;
  }

  protected deadlineClass(daysLeft: number): string {
    const base =
      'flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl text-[15px] font-extrabold leading-none';
    if (daysLeft <= 3) return `${base} bg-red-50 text-red-600`;
    if (daysLeft <= 7) return `${base} bg-accent-amber-soft text-accent-amber-strong`;
    return `${base} bg-surface text-body`;
  }

  protected planDaysClass(daysLeft: number): string {
    if (daysLeft <= 7) return 'font-bold text-red-600';
    if (daysLeft <= 30) return 'font-bold text-accent-amber-strong';
    return 'font-bold text-ink-900';
  }
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
