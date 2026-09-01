import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AdminPagination } from '@/features/admin/shared/admin-pagination/admin-pagination';
import { ReportsApi } from '@/features/admin/reports/data/reports.api';
import {
  REPORT_REASON_LABELS,
  REPORT_STATUS_LABELS,
  VacancyReport,
} from '@/features/admin/reports/models/reports.models';
import { IjIcon } from '@/shared/ui';

const PAGE_SIZE = 10;

/** Cola de moderación: denuncias de vacantes hechas por candidatos. */
@Component({
  selector: 'app-reports-list-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterLink, AdminPagination, IjIcon],
  template: `
    <div class="mx-auto max-w-[1180px]">
      <div class="mb-6">
        <h1 class="text-2xl font-extrabold tracking-tight text-ink-900">Denuncias</h1>
        <p class="mt-1.5 text-[13.5px] text-muted">
          Reportes de candidatos sobre vacantes publicadas. "Solicitan dinero" y
          "no responden" son señal de calidad del empleador.
        </p>
      </div>

      <div class="mb-5 flex flex-wrap gap-2">
        @for (tab of tabs; track tab.value) {
          <button type="button" [class]="tabClass(tab.value)" (click)="filter(tab.value)">
            {{ tab.label }}
          </button>
        }
      </div>

      @if (actionError(); as message) {
        <p role="alert" class="mb-4 rounded-xl bg-red-50 px-4 py-3 text-[13.5px] font-medium text-red-700">
          {{ message }}
        </p>
      }

      @switch (state()) {
        @case ('loading') {
          <div class="rounded-2xl bg-white p-10 text-center text-muted shadow-card">
            Cargando denuncias…
          </div>
        }
        @case ('error') {
          <div class="rounded-2xl bg-white p-10 text-center text-red-600 shadow-card">
            No se pudieron cargar las denuncias.
          </div>
        }
        @default {
          <div class="overflow-x-auto rounded-2xl bg-white shadow-card">
            <table class="w-full min-w-[860px] border-collapse text-left">
              <thead>
                <tr class="border-b border-line">
                  @for (h of headers; track h) {
                    <th class="px-5 py-3.5 text-[11.5px] font-bold uppercase tracking-wide text-muted">
                      {{ h }}
                    </th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (report of reports(); track report.id) {
                  <tr class="border-b border-line/70 transition-colors hover:bg-surface">
                    <td class="px-5 py-3.5">
                      @if (report.vacancyTitle) {
                        <a
                          [routerLink]="['/vacantes', report.vacancyId]"
                          class="text-sm font-semibold text-ink-900 hover:text-brand"
                        >
                          {{ report.vacancyTitle }}
                        </a>
                      } @else {
                        <span class="text-sm text-muted">Vacante eliminada</span>
                      }
                      <div class="text-[12.5px] text-muted">
                        {{ report.companyName ?? '—' }}
                      </div>
                    </td>
                    <td class="px-5 py-3.5">
                      <span class="inline-block rounded-md bg-accent-amber-soft px-2 py-1 text-[11.5px] font-bold text-accent-amber">
                        {{ reasonLabel(report.reasonCode) }}
                      </span>
                      @if (report.comment) {
                        <div class="mt-1 max-w-[320px] truncate text-[12.5px] text-muted" [title]="report.comment">
                          {{ report.comment }}
                        </div>
                      }
                    </td>
                    <td class="px-5 py-3.5">
                      <span
                        class="inline-block rounded-md px-2 py-1 text-[11.5px] font-bold"
                        [class]="
                          report.status === 'PENDING'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-accent-green-soft text-accent-green'
                        "
                      >
                        {{ statusLabel(report.status) }}
                      </span>
                    </td>
                    <td class="px-5 py-3.5 text-[13px] text-muted">
                      {{ report.createdAt | date: 'dd MMM yyyy' }}
                    </td>
                    <td class="px-5 py-3.5">
                      <div class="flex justify-end">
                        @if (report.status === 'PENDING') {
                          <button
                            type="button"
                            class="flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-[12.5px] font-bold text-body transition-colors hover:bg-surface hover:text-brand"
                            (click)="resolve(report)"
                          >
                            <ij-icon name="check" [size]="14" />
                            Resolver
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="5" class="px-5 py-10 text-center text-[13.5px] text-muted">
                      No hay denuncias con este filtro.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <app-admin-pagination
            [page]="page()"
            [pages]="pages()"
            [total]="total()"
            (pageChange)="load($event)"
          />
        }
      }
    </div>
  `,
})
export class ReportsListPage {
  private readonly api = inject(ReportsApi);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly headers = ['Vacante', 'Motivo', 'Estado', 'Fecha', ''];
  protected readonly tabs = [
    { value: 'PENDING', label: 'Pendientes' },
    { value: 'RESOLVED', label: 'Resueltas' },
    { value: '', label: 'Todas' },
  ];

  protected readonly reports = signal<VacancyReport[]>([]);
  protected readonly state = signal<'loading' | 'loaded' | 'error'>('loading');
  protected readonly status = signal('PENDING');
  protected readonly page = signal(1);
  protected readonly pages = signal(1);
  protected readonly total = signal(0);
  protected readonly actionError = signal<string | null>(null);

  constructor() {
    this.load(1);
  }

  protected load(page: number): void {
    this.state.set('loading');
    this.api
      .list(page, PAGE_SIZE, this.status() || undefined)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.reports.set(result.items);
          this.page.set(result.page);
          this.pages.set(result.pages);
          this.total.set(result.total);
          this.state.set('loaded');
        },
        error: () => this.state.set('error'),
      });
  }

  protected filter(status: string): void {
    this.status.set(status);
    this.load(1);
  }

  protected resolve(report: VacancyReport): void {
    this.actionError.set(null);
    this.api
      .resolve(report.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.load(this.page()),
        error: () => this.actionError.set('No se pudo resolver la denuncia.'),
      });
  }

  protected reasonLabel(code: string): string {
    return REPORT_REASON_LABELS[code] ?? code;
  }

  protected statusLabel(code: string): string {
    return REPORT_STATUS_LABELS[code] ?? code;
  }

  protected tabClass(value: string): string {
    const base = 'rounded-xl px-3.5 py-2 text-[13px] font-bold transition-colors';
    return this.status() === value
      ? `${base} bg-brand text-white`
      : `${base} bg-white text-body shadow-card hover:bg-surface`;
  }
}
