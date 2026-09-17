import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import { LocaleFormatService } from '@/core/i18n/locale-format.service';
import { IjAvatar, IjCell, IjColumn, IjIcon, IjSortState, IjTable } from '@/shared/ui';
import { MX_STATES } from '@/shared/catalogs/mx.catalogs';
import { AdminEmpty } from '@/features/admin/shared/admin-empty/admin-empty';
import {
  AdminCompany,
  SUBSCRIPTION_STATUS_LABELS,
  SubscriptionStatus,
} from '@/features/admin/companies/models/companies.models';

const STATE_NAMES = new Map(MX_STATES.map((s) => [s.code, s.name]));

/**
 * Tabla de empresas registradas. Orden **de servidor**: los ids ordenables
 * son los de `COMPANY_SORT_COLUMNS` en el backend.
 *
 * `Plan` y `Miembros` no son ordenables: viven en otras tablas
 * (`company_subscriptions`, `company_users`) y el listado las resuelve en
 * lote después de paginar, así que el ORDER BY no las alcanza. Marcarlas
 * como ordenables daría un orden que el backend ignoraría en silencio.
 */
@Component({
  selector: 'app-companies-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, IjAvatar, IjIcon, IjTable, IjCell, AdminEmpty],
  template: `
    @if (companies().length === 0) {
      <app-admin-empty
        icon="building"
        message="No hay empresas registradas todavía."
        hint="Crea la primera con el botón de arriba; puedes darle su cuenta de acceso en el mismo paso."
      />
    } @else {
      <ij-table
        [data]="companies()"
        [columns]="columns"
        sortMode="server"
        [bare]="true"
        [rowId]="rowId"
        [(sort)]="sort"
      >
        <ng-template ijCell="businessName" [ijCellOf]="companies()" let-company>
          <div class="flex items-center gap-3">
            <ij-avatar
              class="h-9 w-9 rounded-xl bg-brand-50 text-[13px] font-bold text-brand-strong"
              [src]="company.logoUrl"
              [name]="company.businessName"
            />
            <div class="min-w-0">
              <div class="truncate text-sm font-semibold text-ink-900">
                {{ company.businessName }}
              </div>
              <div class="truncate text-[12.5px] text-muted">
                {{ company.legalName }}
              </div>
            </div>
          </div>
        </ng-template>

        <ng-template ijCell="rfc" [ijCellOf]="companies()" let-company>
          <span
            class="rounded-md bg-surface px-2 py-1 text-[12px] font-bold text-body"
          >
            {{ company.rfc }}
          </span>
        </ng-template>

        <ng-template ijCell="state" [ijCellOf]="companies()" let-company>
          <span class="text-[13.5px] text-body">
            {{ stateName(company.state) }} · {{ company.municipality }}
          </span>
        </ng-template>

        <ng-template ijCell="ownerEmail" [ijCellOf]="companies()" let-company>
          @if (company.ownerEmail) {
            <span class="text-[13.5px] text-body">{{ company.ownerEmail }}</span>
          } @else {
            <span
              class="rounded-md bg-accent-amber-soft px-2 py-1 text-[11.5px] font-bold text-accent-amber-strong"
              title="La empresa no tiene una cuenta de acceso vinculada."
            >
              Sin usuario
            </span>
          }
        </ng-template>

        <ng-template ijCell="plan" [ijCellOf]="companies()" let-company>
          @if (company.subscription; as plan) {
            <div class="flex flex-col gap-1">
              <span
                class="w-fit rounded-md px-2 py-1 text-[11.5px] font-bold"
                [class]="planToneClass(plan.status)"
              >
                {{ plan.planName ?? 'Plan sin nombre' }}
              </span>
              <span class="text-[11.5px] text-muted">
                {{ planCaption(plan) }}
              </span>
            </div>
          } @else {
            <span class="text-[12.5px] text-muted">Sin plan</span>
          }
        </ng-template>

        <ng-template ijCell="memberCount" [ijCellOf]="companies()" let-company>
          <span class="text-sm font-bold text-ink-900">
            {{ company.memberCount }}
          </span>
        </ng-template>

        <ng-template ijCell="createdAt" [ijCellOf]="companies()" let-company>
          <span class="text-[13px] text-muted">
            {{ company.createdAt | date: 'dd MMM yyyy' }}
          </span>
        </ng-template>

        <ng-template ijCell="actions" [ijCellOf]="companies()" let-company>
          <div class="flex items-center justify-end gap-1.5">
            <button
              type="button"
              class="flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-[12.5px] font-bold text-body transition-colors hover:bg-surface hover:text-brand-strong active:translate-y-[1px]"
              title="Ver la ficha y gestionar su equipo"
              (click)="open.emit(company)"
            >
              <ij-icon name="users" [size]="14" />
              Equipo
            </button>
            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-body transition-colors hover:bg-surface hover:text-brand-strong active:translate-y-[1px]"
              title="Editar datos de la empresa"
              aria-label="Editar empresa"
              (click)="edit.emit(company)"
            >
              <ij-icon name="pen" [size]="15" />
            </button>
          </div>
        </ng-template>
      </ij-table>
    }
  `,
})
export class CompaniesTable {
  private readonly format = inject(LocaleFormatService);

  readonly companies = input.required<readonly AdminCompany[]>();
  readonly sort = model<IjSortState | null>(null);
  /** Abre la ficha de la empresa (datos + equipo). */
  readonly open = output<AdminCompany>();
  /** Edita los datos de la empresa sin salir del listado. */
  readonly edit = output<AdminCompany>();

  protected readonly rowId = (company: AdminCompany) => company.id;

  protected readonly columns: IjColumn<AdminCompany>[] = [
    { id: 'businessName', header: 'Empresa', sortable: true },
    { id: 'rfc', header: 'RFC', sortable: true, hideBelow: 'md' },
    { id: 'state', header: 'Ubicación', sortable: true, hideBelow: 'lg' },
    { id: 'ownerEmail', header: 'Usuario dueño', hideBelow: 'lg' },
    { id: 'plan', header: 'Plan' },
    { id: 'memberCount', header: 'Miembros', hideBelow: 'sm' },
    { id: 'createdAt', header: 'Alta', sortable: true, hideBelow: 'xl' },
    { id: 'actions', header: '', class: 'text-right' },
  ];

  protected stateName(code: string): string {
    return STATE_NAMES.get(code) ?? code;
  }

  /**
   * Sólo ACTIVE se pinta en verde. Un plan pendiente de pago o con el cobro
   * vencido sigue siendo "vigente" para el backend, pero el administrador
   * necesita distinguirlo de un vistazo.
   */
  protected planToneClass(status: string): string {
    if (status === SubscriptionStatus.ACTIVE) {
      return 'bg-brand-50 text-brand-strong';
    }
    return 'bg-accent-amber-soft text-accent-amber-strong';
  }

  protected planCaption(
    plan: NonNullable<AdminCompany['subscription']>,
  ): string {
    const state = SUBSCRIPTION_STATUS_LABELS[plan.status] ?? plan.status;
    if (!plan.currentPeriodEnd) return state;
    return `${state} · hasta ${this.format.shortDate(plan.currentPeriodEnd)}`;
  }
}
