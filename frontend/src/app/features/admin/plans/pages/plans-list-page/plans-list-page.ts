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
import { Observable } from 'rxjs';
import { ApiErrorResponse } from '@/core/models/api-response.models';
import { IconName, IjButton, IjIcon, IjModal } from '@/shared/ui';
import { AdminConfirm } from '@/features/admin/shared/admin-confirm/admin-confirm';
import { AdminEmpty } from '@/features/admin/shared/admin-empty/admin-empty';
import { AdminError } from '@/features/admin/shared/admin-error/admin-error';
import { AdminTableSkeleton } from '@/features/admin/shared/admin-table-skeleton/admin-table-skeleton';
import { PlansFacade } from '@/features/admin/plans/data/plans.facade';
import { FeatureForm } from '@/features/admin/plans/components/feature-form/feature-form';
import { PlanForm } from '@/features/admin/plans/components/plan-form/plan-form';
import { PlanFeaturesForm } from '@/features/admin/plans/components/plan-features-form/plan-features-form';
import {
  PlanActionEvent,
  PlansTable,
} from '@/features/admin/plans/components/plans-table/plans-table';
import {
  FEATURE_VALUE_TYPE_LABELS,
  Plan,
  PlanFeatureCatalogItem,
  PlanFeatureValuePayload,
  SavePlanFeaturePayload,
  SavePlanPayload,
} from '@/features/admin/plans/models/plans.models';

/** Qué modal está abierto. Sólo uno a la vez. */
type OpenModal = 'plan' | 'features' | 'catalog' | null;

/**
 * Back-office del catálogo de planes. Los precios en MXN y el alcance de cada
 * plan se dan de alta aquí — la semilla sólo trae los códigos de beneficio.
 */
@Component({
  selector: 'app-plans-list-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AdminConfirm,
    AdminEmpty,
    AdminError,
    AdminTableSkeleton,
    PlansTable,
    PlanForm,
    PlanFeaturesForm,
    FeatureForm,
    IjButton,
    IjIcon,
    IjModal,
  ],
  template: `
    <div class="mx-auto max-w-[1180px]">
      <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="text-2xl font-extrabold tracking-tight text-ink-900">
            Planes y beneficios
          </h1>
          <p class="mt-1.5 text-[13.5px] text-muted">
            Tarifas en MXN, vigencias y beneficios que verán las empresas en el portal.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            class="flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-[13.5px] font-bold text-body transition-colors hover:bg-surface"
            (click)="openCatalog(null)"
          >
            <ij-icon name="tag" [size]="16" />
            Nuevo beneficio
          </button>
          <button
            ij-button
            type="button"
            variant="primary"
            shape="rounded"
            size="md"
            (click)="openPlan(null)"
          >
            <ij-icon name="plus" [size]="16" />
            Nuevo plan
          </button>
        </div>
      </div>

      <div class="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        @for (card of statCards(); track card.label) {
          <div class="flex items-center gap-3.5 rounded-2xl bg-white p-4 shadow-card">
            <span
              class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
              [class]="card.tone"
            >
              <ij-icon [name]="card.icon" [size]="20" [strokeWidth]="1.9" />
            </span>
            <div>
              <div class="text-[21px] font-extrabold leading-tight text-ink-900">
                {{ card.value }}
              </div>
              <div class="text-[12.5px] text-muted">{{ card.label }}</div>
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

      @switch (facade.state()) {
        @case ('loading') {
          <app-admin-table-skeleton [rows]="4" label="Cargando planes…" />
        }
        @case ('error') {
          <app-admin-error
            message="No se pudieron cargar los planes."
            (retry)="facade.load()"
          />
        }
        @default {
          <app-plans-table [plans]="facade.plans()" (action)="onAction($event)" />
        }
      }

      <section class="mt-8">
        <div class="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 class="text-lg font-bold text-ink-900">Catálogo de beneficios</h2>
            <p class="mt-1 text-[13.5px] text-muted">
              Los códigos disponibles para armar cada plan.
            </p>
          </div>
        </div>

        <div class="overflow-x-auto rounded-2xl bg-white shadow-card">
          <table class="w-full min-w-[680px] border-collapse text-left">
            <thead>
              <tr class="border-b border-line">
                @for (h of featureHeaders; track h) {
                  <th
                    class="px-5 py-3.5 text-[11.5px] font-bold uppercase tracking-wide text-muted"
                  >
                    {{ h }}
                  </th>
                }
              </tr>
            </thead>
            <tbody>
              @for (feature of facade.features(); track feature.code) {
                <tr class="border-b border-line/70 transition-colors hover:bg-surface">
                  <td class="px-5 py-3.5">
                    <div class="text-[13.5px] font-semibold text-ink-900">
                      {{ feature.name }}
                    </div>
                    @if (feature.description) {
                      <div class="mt-0.5 text-[12.5px] text-muted">
                        {{ feature.description }}
                      </div>
                    }
                  </td>
                  <td class="px-5 py-3.5">
                    <code
                      class="rounded-md bg-brand-50 px-2 py-1 text-[12px] font-bold text-brand-strong"
                    >
                      {{ feature.code }}
                    </code>
                  </td>
                  <td class="px-5 py-3.5 text-[13.5px] text-body">
                    {{ valueTypeLabel(feature) }}
                  </td>
                  <td class="px-5 py-3.5 text-[13.5px] text-muted">{{ feature.sortOrder }}</td>
                  <td class="px-5 py-3.5">
                    <div class="flex justify-end">
                      <button
                        type="button"
                        class="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-body transition-colors hover:bg-surface hover:text-brand-strong active:translate-y-[1px]"
                        title="Editar beneficio"
                        aria-label="Editar beneficio"
                        (click)="openCatalog(feature)"
                      >
                        <ij-icon name="pen" [size]="15" />
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5">
                    <app-admin-empty icon="tag" message="Sin beneficios en el catálogo.">
                      <p class="max-w-[420px] text-[12.5px] text-muted">
                        Ejecuta <code>pnpm run seed:plan-features</code> o crea el primero con
                        "Nuevo beneficio".
                      </p>
                    </app-admin-empty>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </div>

    @if (modal() === 'plan') {
      <ij-modal
        [title]="editingPlan() ? 'Editar plan' : 'Nuevo plan'"
        [subtitle]="editingPlan()?.name ?? 'Se guardará como borrador si no lo publicas.'"
        size="lg"
        (close)="closeModal()"
      >
        <app-plan-form
          [plan]="editingPlan()"
          [submitting]="saving()"
          [error]="formError()"
          (save)="onSavePlan($event)"
          (cancel)="closeModal()"
        />
      </ij-modal>
    }

    @if (modal() === 'features' && editingPlan(); as plan) {
      <ij-modal
        title="Beneficios del plan"
        [subtitle]="plan.name"
        size="lg"
        (close)="closeModal()"
      >
        <app-plan-features-form
          [plan]="plan"
          [catalog]="facade.features()"
          [submitting]="saving()"
          [error]="formError()"
          (save)="onSaveFeatures(plan, $event)"
          (cancel)="closeModal()"
        />
      </ij-modal>
    }

    @if (modal() === 'catalog') {
      <ij-modal
        [title]="editingFeature() ? 'Editar beneficio' : 'Nuevo beneficio'"
        [subtitle]="editingFeature()?.name ?? 'Se añadirá al catálogo comparativo.'"
        (close)="closeModal()"
      >
        <app-feature-form
          [feature]="editingFeature()"
          [submitting]="saving()"
          [error]="formError()"
          (save)="onSaveFeature($event)"
          (cancel)="closeModal()"
        />
      </ij-modal>
    }

    @if (deactivating(); as plan) {
      <app-admin-confirm
        title="Despublicar plan"
        [message]="deactivateMessage(plan)"
        confirmLabel="Despublicar"
        tone="primary"
        (confirm)="onDeactivateConfirmed(plan)"
        (cancel)="deactivating.set(null)"
      />
    }
  `,
})
export class PlansListPage {
  protected readonly facade = inject(PlansFacade);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly modal = signal<OpenModal>(null);
  protected readonly editingPlan = signal<Plan | null>(null);
  protected readonly editingFeature = signal<PlanFeatureCatalogItem | null>(null);
  protected readonly deactivating = signal<Plan | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);

  protected readonly featureHeaders = ['Beneficio', 'Código', 'Tipo', 'Orden', ''];

  protected readonly statCards = computed(() => {
    const stats = this.facade.stats();
    return [
      {
        label: 'Planes en catálogo',
        value: stats.total,
        icon: 'tag' as IconName,
        tone: 'bg-brand-50 text-brand-strong',
      },
      {
        label: 'Publicados',
        value: stats.active,
        icon: 'check' as IconName,
        tone: 'bg-accent-green-soft text-accent-green-strong',
      },
      {
        label: 'Por publicación',
        value: stats.perPublication,
        icon: 'briefcase' as IconName,
        tone: 'bg-accent-amber-soft text-accent-amber-strong',
      },
      {
        label: 'Suscripciones',
        value: stats.subscription,
        icon: 'credit-card' as IconName,
        tone: 'bg-surface text-muted',
      },
    ];
  });

  constructor() {
    this.facade.load();
    this.facade.loadFeatures();
  }

  protected valueTypeLabel(feature: PlanFeatureCatalogItem): string {
    return FEATURE_VALUE_TYPE_LABELS[feature.valueType] ?? feature.valueType;
  }

  protected openPlan(plan: Plan | null): void {
    this.editingPlan.set(plan);
    this.editingFeature.set(null);
    this.formError.set(null);
    this.modal.set('plan');
  }

  protected openCatalog(feature: PlanFeatureCatalogItem | null): void {
    this.editingPlan.set(null);
    this.editingFeature.set(feature);
    this.formError.set(null);
    this.modal.set('catalog');
  }

  protected closeModal(): void {
    this.modal.set(null);
    this.editingPlan.set(null);
    this.editingFeature.set(null);
    this.formError.set(null);
  }

  protected onAction(event: PlanActionEvent): void {
    const { action, plan } = event;
    switch (action) {
      case 'edit':
        this.openPlan(plan);
        return;
      case 'features':
        this.editingPlan.set(plan);
        this.editingFeature.set(null);
        this.formError.set(null);
        this.modal.set('features');
        return;
      case 'activate':
        this.run(
          this.facade.changeStatus(plan.id, true),
          'No se pudo publicar el plan.',
        );
        return;
      case 'deactivate':
        this.deactivating.set(plan);
    }
  }

  protected deactivateMessage(plan: Plan): string {
    return `¿Despublicar "${plan.name}"? Dejará de aparecer en el portal; las compras existentes no se tocan.`;
  }

  protected onDeactivateConfirmed(plan: Plan): void {
    this.deactivating.set(null);
    this.run(
      this.facade.changeStatus(plan.id, false),
      'No se pudo despublicar el plan.',
    );
  }

  protected onSavePlan(payload: SavePlanPayload): void {
    const editing = this.editingPlan();
    this.submit(
      editing
        ? this.facade.update(editing.id, payload)
        : this.facade.create(payload),
      'No se pudo guardar el plan.',
    );
  }

  protected onSaveFeatures(
    plan: Plan,
    features: PlanFeatureValuePayload[],
  ): void {
    this.submit(
      this.facade.setFeatures(plan.id, features),
      'No se pudieron guardar los beneficios.',
    );
  }

  protected onSaveFeature(payload: SavePlanFeaturePayload): void {
    this.submit(
      this.facade.saveFeature(payload),
      'No se pudo guardar el beneficio.',
    );
  }

  /** Envío desde un modal: cierra al terminar, deja el error dentro si falla. */
  private submit(request: Observable<unknown>, fallback: string): void {
    this.saving.set(true);
    this.formError.set(null);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeModal();
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.formError.set(this.messageOf(error, fallback));
      },
    });
  }

  /** Acción de fila: el error se muestra sobre la tabla. */
  private run(request: Observable<unknown>, fallback: string): void {
    this.actionError.set(null);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      error: (error: unknown) =>
        this.actionError.set(this.messageOf(error, fallback)),
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
