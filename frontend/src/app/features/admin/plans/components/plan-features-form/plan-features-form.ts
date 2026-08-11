import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IjButton } from '@/shared/ui';
import {
  FEATURE_VALUE_TYPE_LABELS,
  FeatureValueType,
  Plan,
  PlanFeatureCatalogItem,
  PlanFeatureValuePayload,
  UNLIMITED_VALUE,
} from '@/features/admin/plans/models/plans.models';

/** Una fila de la matriz: el beneficio del catálogo con su valor en el plan. */
interface FeatureRow {
  code: string;
  name: string;
  description: string | null;
  valueType: FeatureValueType;
  isIncluded: boolean;
  value: string;
}

/**
 * Matriz de beneficios de un plan. Se recorre el **catálogo** completo, no sólo
 * lo contratado, para que quitar un beneficio sea posible: el backend reemplaza
 * la matriz entera en cada guardado.
 *
 * Los beneficios `BOOLEAN` sólo se marcan; el resto llevan además un valor
 * (`-1` significa ilimitado, igual que en el backend).
 */
@Component({
  selector: 'app-plan-features-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IjButton],
  template: `
    @if (error()) {
      <p
        role="alert"
        class="mb-4 rounded-lg bg-red-50 px-3 py-2 text-[13px] font-medium text-red-700"
      >
        {{ error() }}
      </p>
    }

    @if (rows().length === 0) {
      <p class="rounded-xl bg-surface px-4 py-6 text-center text-[13.5px] text-muted">
        No hay beneficios en el catálogo. Si acabas de instalar, ejecuta
        <code>pnpm run seed:plan-features</code>; si no, crea el primero desde
        “Nuevo beneficio”.
      </p>
    } @else {
      <div class="max-h-[52vh] overflow-y-auto rounded-xl border border-line">
        <table class="w-full border-collapse text-left">
          <thead class="sticky top-0 bg-white">
            <tr class="border-b border-line">
              <th class="px-4 py-3 text-[11.5px] font-bold uppercase tracking-wide text-muted">
                Incluido
              </th>
              <th class="px-4 py-3 text-[11.5px] font-bold uppercase tracking-wide text-muted">
                Beneficio
              </th>
              <th class="px-4 py-3 text-[11.5px] font-bold uppercase tracking-wide text-muted">
                Valor
              </th>
            </tr>
          </thead>
          <tbody>
            @for (row of rows(); track row.code) {
              <tr class="border-b border-line/70 last:border-0">
                <td class="px-4 py-3 align-top">
                  <input
                    type="checkbox"
                    class="mt-0.5 h-4 w-4 rounded border-line text-brand focus:ring-brand"
                    [attr.aria-label]="'Incluir ' + row.name"
                    [ngModel]="row.isIncluded"
                    (ngModelChange)="toggle(row.code, $event)"
                  />
                </td>
                <td class="px-4 py-3">
                  <div class="text-[13.5px] font-semibold text-ink-900">{{ row.name }}</div>
                  <div class="mt-0.5 text-[12px] text-muted">
                    <code class="text-brand">{{ row.code }}</code>
                    · {{ typeLabel(row.valueType) }}
                  </div>
                  @if (row.description) {
                    <div class="mt-0.5 text-[12.5px] text-muted">{{ row.description }}</div>
                  }
                </td>
                <td class="px-4 py-3 align-top">
                  @if (row.valueType === boolean) {
                    <span class="text-[13px] text-muted">—</span>
                  } @else {
                    <div class="flex flex-col gap-1.5">
                      <input
                        [type]="row.valueType === text ? 'text' : 'number'"
                        class="h-[38px] w-[150px] rounded-lg border border-line bg-white px-3 text-[13px] text-ink-900 placeholder:text-muted focus:border-brand focus:outline-none focus:ring-0 disabled:bg-surface disabled:text-muted"
                        [attr.aria-label]="'Valor de ' + row.name"
                        [placeholder]="placeholder(row.valueType)"
                        [disabled]="!row.isIncluded"
                        [ngModel]="row.value"
                        (ngModelChange)="setValue(row.code, $event)"
                      />
                      @if (row.valueType !== text) {
                        <label class="flex items-center gap-2 text-[12px] text-muted">
                          <input
                            type="checkbox"
                            class="h-3.5 w-3.5 rounded border-line text-brand focus:ring-brand"
                            [disabled]="!row.isIncluded"
                            [ngModel]="row.value === unlimited"
                            (ngModelChange)="setUnlimited(row.code, $event)"
                          />
                          Ilimitado
                        </label>
                      }
                    </div>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    <div class="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-line pt-4">
      <p class="mr-auto text-[12.5px] text-muted">
        {{ includedCount() }} de {{ rows().length }} beneficios incluidos.
      </p>
      <button
        type="button"
        class="rounded-xl border border-line bg-white px-4 py-2.5 text-[13.5px] font-bold text-body transition-colors hover:bg-surface"
        (click)="cancel.emit()"
      >
        Cancelar
      </button>
      <button
        ij-button
        type="button"
        variant="primary"
        shape="rounded"
        size="md"
        [disabled]="submitting() || rows().length === 0"
        (click)="onSubmit()"
      >
        {{ submitting() ? 'Guardando…' : 'Guardar beneficios' }}
      </button>
    </div>
  `,
})
export class PlanFeaturesForm implements OnInit {
  readonly plan = input.required<Plan>();
  /** Catálogo completo: manda sobre lo que el plan tenga guardado. */
  readonly catalog = input.required<readonly PlanFeatureCatalogItem[]>();
  readonly submitting = input(false);
  readonly error = input<string | null>(null);
  readonly save = output<PlanFeatureValuePayload[]>();
  readonly cancel = output<void>();

  protected readonly boolean = FeatureValueType.BOOLEAN;
  protected readonly text = FeatureValueType.TEXT;
  protected readonly unlimited = UNLIMITED_VALUE;

  protected readonly rows = signal<FeatureRow[]>([]);

  ngOnInit(): void {
    const assigned = new Map(
      this.plan().features.map((feature) => [feature.code, feature]),
    );

    this.rows.set(
      this.catalog().map((feature) => {
        const current = assigned.get(feature.code);
        return {
          code: feature.code,
          name: feature.name,
          description: feature.description,
          valueType: feature.valueType,
          isIncluded: current?.isIncluded ?? false,
          value: current?.value ?? '',
        };
      }),
    );
  }

  protected includedCount(): number {
    return this.rows().filter((row) => row.isIncluded).length;
  }

  protected typeLabel(valueType: FeatureValueType): string {
    return FEATURE_VALUE_TYPE_LABELS[valueType] ?? valueType;
  }

  protected placeholder(valueType: FeatureValueType): string {
    switch (valueType) {
      case FeatureValueType.PERCENT:
        return '25';
      case FeatureValueType.NUMERIC:
        return '30';
      default:
        return 'Valor';
    }
  }

  protected toggle(code: string, isIncluded: boolean): void {
    this.patch(code, (row) => ({ ...row, isIncluded }));
  }

  protected setValue(code: string, value: string | number): void {
    this.patch(code, (row) => ({ ...row, value: String(value ?? '') }));
  }

  protected setUnlimited(code: string, unlimited: boolean): void {
    this.patch(code, (row) => ({
      ...row,
      value: unlimited ? UNLIMITED_VALUE : '',
    }));
  }

  private patch(code: string, change: (row: FeatureRow) => FeatureRow): void {
    this.rows.update((list) =>
      list.map((row) => (row.code === code ? change(row) : row)),
    );
  }

  protected onSubmit(): void {
    // Se envía la matriz completa, incluidos los excluidos: así el plan queda
    // explícito y la comparativa pública no depende de ausencias.
    const features: PlanFeatureValuePayload[] = this.rows().map((row) => {
      const item: PlanFeatureValuePayload = {
        featureCode: row.code,
        isIncluded: row.isIncluded,
      };
      const value = row.value.trim();
      if (row.valueType !== FeatureValueType.BOOLEAN && row.isIncluded && value) {
        item.value = value;
      }
      return item;
    });

    this.save.emit(features);
  }
}
