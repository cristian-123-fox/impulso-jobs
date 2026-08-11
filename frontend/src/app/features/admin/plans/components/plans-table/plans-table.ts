import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IjIcon } from '@/shared/ui';
import {
  BILLING_PERIOD_LABELS,
  PLAN_TYPE_LABELS,
  Plan,
  PlanType,
} from '@/features/admin/plans/models/plans.models';

/** Acción solicitada sobre un plan desde la tabla. */
export type PlanAction = 'edit' | 'features' | 'activate' | 'deactivate';

export interface PlanActionEvent {
  action: PlanAction;
  plan: Plan;
}

/** Tabla del catálogo de planes. Presentacional: sólo emite intenciones. */
@Component({
  selector: 'app-plans-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, IjIcon],
  template: `
    <div class="overflow-x-auto rounded-2xl bg-white shadow-card">
      <table class="w-full min-w-[920px] border-collapse text-left">
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
          @for (plan of plans(); track plan.id) {
            <tr class="border-b border-line/70 transition-colors hover:bg-surface">
              <td class="px-5 py-3.5">
                <button
                  type="button"
                  class="text-left text-sm font-semibold text-ink-900 transition-colors hover:text-brand"
                  (click)="emit('edit', plan)"
                >
                  {{ plan.name }}
                </button>
                <div class="mt-1 flex flex-wrap items-center gap-1.5">
                  <span class="rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand">
                    {{ plan.code }}
                  </span>
                  @if (plan.isPopular) {
                    <span
                      class="rounded-md bg-accent-amber-soft px-2 py-0.5 text-[11px] font-bold text-[#b26a15]"
                    >
                      Más popular
                    </span>
                  }
                </div>
              </td>
              <td class="px-5 py-3.5 text-[13.5px] text-body">
                {{ typeLabel(plan) }}
                <div class="text-[12.5px] text-muted">{{ periodLabel(plan) }}</div>
              </td>
              <td class="px-5 py-3.5">
                <div class="text-sm font-bold text-ink-900">
                  {{ plan.price.total | currency: plan.price.currency : 'symbol-narrow' : '1.2-2' }}
                </div>
                <div class="text-[12px] text-muted">
                  {{ plan.price.subtotal | currency: plan.price.currency : 'symbol-narrow' : '1.2-2' }}
                  + IVA
                </div>
              </td>
              <td class="px-5 py-3.5 text-[13.5px] text-body">{{ scopeLabel(plan) }}</td>
              <td class="px-5 py-3.5 text-[13.5px] text-body">
                {{ includedCount(plan) }} / {{ plan.features.length }}
              </td>
              <td class="px-5 py-3.5">
                <span
                  class="inline-block rounded-md px-2 py-1 text-[11.5px] font-bold"
                  [class]="
                    plan.isActive
                      ? 'bg-accent-green-soft text-accent-green'
                      : 'bg-surface text-muted'
                  "
                >
                  {{ plan.isActive ? 'Publicado' : 'Borrador' }}
                </span>
              </td>
              <td class="px-5 py-3.5">
                <div class="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    [class]="actionClass"
                    title="Editar plan"
                    aria-label="Editar plan"
                    (click)="emit('edit', plan)"
                  >
                    <ij-icon name="pen" [size]="15" />
                  </button>
                  <button
                    type="button"
                    [class]="actionClass"
                    title="Beneficios del plan"
                    aria-label="Beneficios del plan"
                    (click)="emit('features', plan)"
                  >
                    <ij-icon name="list" [size]="15" />
                  </button>
                  @if (plan.isActive) {
                    <button
                      type="button"
                      class="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-body transition-colors hover:bg-red-50 hover:text-red-600"
                      title="Despublicar (deja de venderse)"
                      aria-label="Despublicar plan"
                      (click)="emit('deactivate', plan)"
                    >
                      <ij-icon name="pause" [size]="15" />
                    </button>
                  } @else {
                    <button
                      type="button"
                      [class]="actionClass"
                      title="Publicar en el portal"
                      aria-label="Publicar plan"
                      (click)="emit('activate', plan)"
                    >
                      <ij-icon name="check" [size]="16" />
                    </button>
                  }
                </div>
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="7" class="px-5 py-10 text-center text-[13.5px] text-muted">
                Aún no hay planes. Crea el primero para que aparezca en el portal.
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class PlansTable {
  readonly plans = input.required<readonly Plan[]>();
  readonly action = output<PlanActionEvent>();

  protected readonly headers = [
    'Plan',
    'Modalidad',
    'Precio',
    'Alcance',
    'Beneficios',
    'Estado',
    '',
  ];

  protected readonly actionClass =
    'flex h-8 w-8 items-center justify-center rounded-lg border border-line text-body ' +
    'transition-colors hover:bg-surface hover:text-brand';

  protected typeLabel(plan: Plan): string {
    return PLAN_TYPE_LABELS[plan.planType] ?? plan.planType;
  }

  protected periodLabel(plan: Plan): string {
    return BILLING_PERIOD_LABELS[plan.billingPeriod] ?? plan.billingPeriod;
  }

  /** Lo que "compra" el plan: días de publicación o vacantes incluidas. */
  protected scopeLabel(plan: Plan): string {
    if (plan.planType === PlanType.PER_PUBLICATION) {
      return plan.validityDays ? `${plan.validityDays} días` : '—';
    }
    if (plan.postingQuota === null) return 'Sin cupo definido';
    return plan.postingQuota === 0
      ? 'Publicaciones ilimitadas'
      : `${plan.postingQuota} publicaciones`;
  }

  protected includedCount(plan: Plan): number {
    return plan.features.filter((feature) => feature.isIncluded).length;
  }

  protected emit(action: PlanAction, plan: Plan): void {
    this.action.emit({ action, plan });
  }
}
