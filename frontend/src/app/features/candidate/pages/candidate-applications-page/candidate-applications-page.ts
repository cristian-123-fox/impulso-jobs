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
import { CandidateApplicationsApi } from '@/features/candidate/data/candidate-applications.api';
import {
  ApplicationStatus,
  CandidateApplication,
} from '@/features/candidate/models/candidate-applications.models';
import { IjBadge, IjButton, IjIcon, Tone } from '@/shared/ui';

const PAGE_SIZE = 10;

/** Mis postulaciones — lista real sobre `GET /candidate/applications`. */
@Component({
  selector: 'app-candidate-applications-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterLink, AdminPagination, IjBadge, IjButton, IjIcon],
  template: `
    <div class="mx-auto max-w-[1180px]">
      <div class="mb-6">
        <h1 class="text-2xl font-extrabold tracking-tight text-ink-900">Mis postulaciones</h1>
        <p class="mt-1.5 text-[13.5px] text-muted">
          El estado de cada vacante a la que te has postulado.
        </p>
      </div>

      @if (loading()) {
        <div class="rounded-2xl bg-white p-8 shadow-card">
          <div class="animate-pulse space-y-4">
            @for (i of [1, 2, 3]; track i) {
              <div class="h-20 rounded-2xl bg-surface"></div>
            }
          </div>
        </div>
      } @else if (error()) {
        <div class="rounded-2xl border border-red-100 bg-red-50 p-8 text-center text-red-700">
          {{ error() }}
        </div>
      } @else if (items().length === 0) {
        <div class="rounded-2xl bg-white p-10 text-center shadow-card">
          <span
            class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand"
          >
            <ij-icon name="briefcase" [size]="26" />
          </span>
          <h2 class="text-lg font-bold text-ink-900">Aún no tienes postulaciones</h2>
          <p class="mx-auto mt-1.5 max-w-md text-[13.5px] text-muted">
            Explora las vacantes publicadas y postúlate a las que encajen con tu perfil.
          </p>
          <a ij-button routerLink="/vacantes" shape="rounded" class="mt-5 inline-flex">
            Buscar empleo
          </a>
        </div>
      } @else {
        <div class="space-y-3">
          @for (item of items(); track item.id) {
            <article
              class="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-card sm:flex-row sm:items-center"
            >
              <div
                class="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-line bg-surface text-[15px] font-extrabold text-brand"
              >
                @if (item.vacancy?.companyLogoUrl; as logo) {
                  <img [src]="logo" alt="" class="h-full w-full object-cover" />
                } @else {
                  {{ companyInitials(item) }}
                }
              </div>

              <div class="min-w-0 flex-1">
                @if (item.vacancy; as vacancy) {
                  <a
                    [routerLink]="['/vacantes', vacancy.id]"
                    class="block truncate text-[15px] font-bold text-ink-900 hover:text-brand"
                  >
                    {{ vacancy.title }}
                  </a>
                  <p class="mt-0.5 truncate text-[13px] text-muted">
                    {{ vacancy.companyName ?? 'Empresa confidencial' }}
                    · {{ vacancy.municipality }}, {{ vacancy.state }}
                  </p>
                } @else {
                  <p class="text-[15px] font-bold text-ink-900">Vacante no disponible</p>
                }
                <p class="mt-1 text-[12.5px] text-muted">
                  Postulada el {{ item.appliedAt | date: 'dd MMM yyyy' }}
                </p>
              </div>

              <div class="flex flex-shrink-0 items-center">
                @if (item.status; as status) {
                  <ij-badge [tone]="statusTone(status)">{{ status.name }}</ij-badge>
                } @else {
                  <ij-badge tone="brand">En proceso</ij-badge>
                }
              </div>
            </article>
          }
        </div>

        @if (pages() > 1) {
          <div class="mt-5">
            <app-admin-pagination
              [page]="page()"
              [pages]="pages()"
              [total]="total()"
              (pageChange)="onPageChange($event)"
            />
          </div>
        }
      }
    </div>
  `,
})
export class CandidateApplicationsPage {
  private readonly api = inject(CandidateApplicationsApi);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly items = signal<CandidateApplication[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly page = signal(1);
  protected readonly pages = signal(1);
  protected readonly total = signal(0);

  constructor() {
    this.load(1);
  }

  protected onPageChange(page: number): void {
    this.load(page);
  }

  protected statusTone(status: ApplicationStatus): Tone {
    switch (status.code) {
      case 'SELECTED':
        return 'green';
      case 'REJECTED':
        return 'pink';
      case 'INTERVIEW':
      case 'TECHNICAL_TEST':
        return 'amber';
      default:
        return 'brand';
    }
  }

  protected companyInitials(item: CandidateApplication): string {
    const name = item.vacancy?.companyName ?? 'C';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? '')
      .join('');
  }

  private load(page: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .list(page, PAGE_SIZE)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.items.set(result.items);
          this.page.set(result.page);
          this.pages.set(result.pages);
          this.total.set(result.total);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('No pudimos cargar tus postulaciones en este momento.');
          this.loading.set(false);
        },
      });
  }
}
