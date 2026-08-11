import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ApiErrorResponse } from '@/core/models/api-response.models';
import { MX_STATES } from '@/shared/catalogs/mx.catalogs';
import { IjIcon, IjModal, IjOption, IjSelect } from '@/shared/ui';
import { AdminPagination } from '@/features/admin/shared/admin-pagination/admin-pagination';
import { CandidatesFacade } from '@/features/company/candidates/data/candidates.facade';
import { CandidateDetailView } from '@/features/company/candidates/components/candidate-detail/candidate-detail';
import {
  CandidateAccessSource,
  CandidateDetail,
  CandidateSearchItem,
} from '@/features/company/candidates/models/candidates.models';

/**
 * Banco de talento. Buscar es gratis; abrir una ficha del banco descuenta una
 * visita del cupo comprado — por eso se avisa antes de abrirla.
 */
@Component({
  selector: 'app-candidates-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    AdminPagination,
    CandidateDetailView,
    IjIcon,
    IjModal,
    IjSelect,
  ],
  template: `
    <div class="mx-auto max-w-[1180px]">
      <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="text-2xl font-extrabold tracking-tight text-ink-900">
            Buscar candidatos
          </h1>
          <p class="mt-1.5 text-[13.5px] text-muted">
            Perfiles públicos y quienes postularon a tus vacantes.
          </p>
        </div>
        @if (facade.quota(); as quota) {
          <div class="rounded-2xl bg-white px-4 py-3 shadow-card">
            <div class="text-[12px] font-bold uppercase tracking-wide text-muted">
              Visitas disponibles
            </div>
            <div class="mt-0.5 text-[19px] font-extrabold text-ink-900">
              @if (quota.unlimited) {
                Ilimitadas
              } @else {
                {{ quota.remainingVisits }}
                <span class="text-[13px] font-semibold text-muted">
                  de {{ quota.totalVisits }}
                </span>
              }
            </div>
          </div>
        }
      </div>

      @if (actionError(); as message) {
        <p
          role="alert"
          class="mb-4 rounded-xl bg-red-50 px-4 py-3 text-[13.5px] font-medium text-red-700"
        >
          {{ message }}
        </p>
      }

      <form
        class="mb-5 grid gap-3 rounded-2xl bg-white p-4 shadow-card lg:grid-cols-[1fr_200px_200px_auto]"
        (ngSubmit)="facade.applyFilters()"
      >
        <label class="relative block">
          <span class="sr-only">Buscar candidato</span>
          <span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
            <ij-icon name="search" [size]="17" />
          </span>
          <input
            type="search"
            name="search"
            placeholder="Nombre o título profesional…"
            class="h-[46px] w-full rounded-xl border border-line bg-white pl-10 pr-3 text-[13.5px] text-ink-900 placeholder:text-muted focus:border-brand focus:outline-none focus:ring-0"
            [ngModel]="facade.search()"
            (ngModelChange)="facade.search.set($event)"
          />
        </label>
        <ij-select
          name="state"
          placeholder="Todos los estados"
          [options]="stateOptions"
          [ngModel]="facade.stateCode()"
          (ngModelChange)="facade.stateCode.set($event)"
        />
        <input
          type="text"
          name="skill"
          placeholder="Habilidad…"
          class="h-[46px] w-full rounded-xl border border-line bg-white px-3.5 text-[13.5px] text-ink-900 placeholder:text-muted focus:border-brand focus:outline-none focus:ring-0"
          [ngModel]="facade.skill()"
          (ngModelChange)="facade.skill.set($event)"
        />
        <div class="flex items-center gap-2">
          <button
            type="submit"
            class="h-[46px] rounded-xl bg-brand px-5 text-[13.5px] font-bold text-white transition-colors hover:bg-brand-600"
          >
            Buscar
          </button>
          <button
            type="button"
            class="h-[46px] rounded-xl border border-line bg-white px-4 text-[13.5px] font-bold text-body transition-colors hover:bg-surface"
            (click)="facade.clearFilters()"
          >
            Limpiar
          </button>
        </div>
        <label class="flex items-center gap-2.5 text-[13.5px] text-body lg:col-span-4">
          <input
            type="checkbox"
            name="available"
            class="h-4 w-4 rounded border-line text-brand focus:ring-brand"
            [ngModel]="facade.onlyAvailable()"
            (ngModelChange)="facade.onlyAvailable.set($event)"
          />
          Sólo disponibilidad inmediata
        </label>
      </form>

      @switch (facade.state()) {
        @case ('loading') {
          <div class="rounded-2xl bg-white p-10 text-center text-muted shadow-card">
            Buscando candidatos…
          </div>
        }
        @case ('error') {
          <div class="rounded-2xl bg-white p-10 text-center text-red-600 shadow-card">
            No se pudo cargar el banco de talento.
          </div>
        }
        @default {
          <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            @for (candidate of facade.candidates(); track candidate.id) {
              <article class="flex flex-col rounded-2xl bg-white p-5 shadow-card">
                <div class="flex items-start gap-3">
                  <span
                    class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-brand-50 text-[14px] font-bold text-brand"
                  >
                    {{ initials(candidate) }}
                  </span>
                  <div class="min-w-0">
                    <h3 class="truncate text-[14.5px] font-bold text-ink-900">
                      {{ candidate.firstName }} {{ candidate.lastName }}
                    </h3>
                    <p class="truncate text-[12.5px] text-muted">
                      {{ candidate.professionalTitle || 'Sin título profesional' }}
                    </p>
                  </div>
                </div>

                <p class="mt-3 flex items-center gap-1.5 text-[12.5px] text-muted">
                  <ij-icon name="map-pin" [size]="14" />
                  {{ candidate.municipality }}, {{ candidate.state }}
                </p>

                <div class="mt-2.5 flex flex-wrap gap-1.5">
                  @if (candidate.isImmediatelyAvailable) {
                    <span
                      class="rounded-md bg-accent-green-soft px-2 py-0.5 text-[11px] font-bold text-accent-green"
                    >
                      Disponible ya
                    </span>
                  }
                  @if (candidate.accessSource === applicant) {
                    <span class="rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand">
                      Postuló contigo
                    </span>
                  } @else if (candidate.alreadyUnlocked) {
                    <span class="rounded-md bg-surface px-2 py-0.5 text-[11px] font-bold text-muted">
                      Ya desbloqueado
                    </span>
                  } @else {
                    <span
                      class="rounded-md bg-accent-amber-soft px-2 py-0.5 text-[11px] font-bold text-[#b26a15]"
                    >
                      Consume 1 visita
                    </span>
                  }
                </div>

                <button
                  type="button"
                  class="mt-4 w-full rounded-xl border border-line bg-white py-2.5 text-[13px] font-bold text-brand transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
                  [disabled]="opening() === candidate.id"
                  (click)="onOpen(candidate)"
                >
                  {{ opening() === candidate.id ? 'Abriendo…' : 'Ver perfil' }}
                </button>
              </article>
            } @empty {
              <div
                class="rounded-2xl bg-white p-10 text-center text-[13.5px] text-muted shadow-card sm:col-span-2 xl:col-span-3"
              >
                Ningún candidato coincide con la búsqueda.
              </div>
            }
          </div>

          <app-admin-pagination
            [page]="facade.page()"
            [pages]="facade.pages()"
            [total]="facade.total()"
            (pageChange)="facade.load($event)"
          />
        }
      }
    </div>

    @if (detail(); as data) {
      <ij-modal
        title="Perfil del candidato"
        [subtitle]="data.firstName + ' ' + data.lastName"
        size="lg"
        (close)="detail.set(null)"
      >
        <app-candidate-detail [candidate]="data" />
      </ij-modal>
    }
  `,
})
export class CandidatesPage {
  protected readonly facade = inject(CandidatesFacade);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly applicant = CandidateAccessSource.APPLICANT;
  protected readonly detail = signal<CandidateDetail | null>(null);
  protected readonly opening = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);

  protected readonly stateOptions: readonly IjOption[] = [
    { value: '', label: 'Todos los estados' },
    ...MX_STATES.map((s) => ({ value: s.code, label: s.name })),
  ];

  /** Cupo agotado: abrir una ficha del banco fallará en el backend. */
  private readonly outOfQuota = computed(() => {
    const quota = this.facade.quota();
    return quota ? !quota.unlimited && quota.remainingVisits <= 0 : false;
  });

  constructor() {
    this.facade.load(1);
  }

  protected initials(candidate: CandidateSearchItem): string {
    return (candidate.firstName[0] ?? '?')
      .concat(candidate.lastName[0] ?? '')
      .toUpperCase();
  }

  protected onOpen(candidate: CandidateSearchItem): void {
    // Sólo cuesta si viene del banco de talento y no se ha abierto antes.
    const costs =
      candidate.accessSource === CandidateAccessSource.TALENT_POOL &&
      !candidate.alreadyUnlocked;

    if (costs && this.outOfQuota()) {
      this.actionError.set(
        'Te quedaste sin visitas. Contrata un plan para seguir consultando el banco de talento.',
      );
      return;
    }

    if (
      costs &&
      !confirm(
        `Abrir el perfil de ${candidate.firstName} ${candidate.lastName} consume 1 visita de tu cupo. ¿Continuar?`,
      )
    ) {
      return;
    }

    this.actionError.set(null);
    this.opening.set(candidate.id);
    this.facade
      .open(candidate.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.opening.set(null);
          this.detail.set(data);
        },
        error: (error: unknown) => {
          this.opening.set(null);
          this.actionError.set(
            this.messageOf(error, 'No se pudo abrir el perfil.'),
          );
        },
      });
  }

  private messageOf(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as ApiErrorResponse | null;
      return body?.errors?.[0]?.message ?? body?.message ?? fallback;
    }
    return fallback;
  }
}
