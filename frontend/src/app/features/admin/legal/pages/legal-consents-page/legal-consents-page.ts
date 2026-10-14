import { DatePipe, JsonPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminEmpty } from '@/features/admin/shared/admin-empty/admin-empty';
import { AdminError } from '@/features/admin/shared/admin-error/admin-error';
import { AdminPagination } from '@/features/admin/shared/admin-pagination/admin-pagination';
import { AdminTableSkeleton } from '@/features/admin/shared/admin-table-skeleton/admin-table-skeleton';
import { AdminLegalFacade } from '@/features/admin/legal/data/admin-legal.facade';
import {
  AdminLegalConsent,
  CONSENT_DOCUMENT_FILTERS,
  CONSENT_METHOD_LABELS,
  CONSENT_SOURCE_LABELS,
  type ConsentSourceWire,
  type LegalDocCodeWire,
} from '@/features/admin/legal/models/legal-consents.models';
import {
  IjCell,
  type IjColumn,
  IjIcon,
  IjModal,
  IjSelect,
  type IjSortState,
  IjTable,
} from '@/shared/ui';

/**
 * Registro de consentimientos del back-office.
 *
 * ## Para qué existe
 *
 * Es la lectura que hace falta cuando un titular ejerce un derecho ARCO o
 * cuando la autoridad pide comprobar qué aceptó una persona y cuándo. Los
 * documentos legales prometen que cada titular puede ver su propio registro; sin
 * una pantalla de este lado, comprobarlo exigiría una consulta a mano cada vez.
 *
 * ## Lo que este listado **no** es
 *
 * No es un panel de gestión: **no hay acciones que muten nada.**
 * `legal_consents` es una bitácora *append-only* y el back-office no es la
 * excepción. La única forma de revocar es que la persona lo haga desde su
 * cuenta, que inserta una fila nueva con `granted = false`. Editar o borrar una
 * fila desde aquí convertiría la evidencia en una afirmación sin respaldo, que
 * es justo lo que la Ley no permite.
 *
 * ## Las dos cifras de la cabecera
 *
 * «Decisiones registradas» cuenta **filas**: es histórico e incluye las que se
 * revocaron después. Las tres cifras «vigentes» cuentan **titulares** cuya
 * última decisión sobre ese documento fue aceptarlo. Las dos cosas se enseñan
 * porque discrepan es información, no ruido: una diferencia grande significa
 * que ha habido revocaciones, que es justamente lo que hay que saber.
 */
@Component({
  selector: 'app-legal-consents-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    FormsModule,
    JsonPipe,
    AdminEmpty,
    AdminError,
    AdminPagination,
    AdminTableSkeleton,
    IjCell,
    IjIcon,
    IjModal,
    IjSelect,
    IjTable,
  ],
  template: `
    <div class="flex flex-col gap-5">
      <header class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-xl font-semibold text-ink-900">
            Consentimientos
          </h1>
          <p class="mt-1 max-w-[70ch] text-sm leading-relaxed text-muted">
            Qué documento aceptó cada titular, con versión, fecha, IP y navegador. El registro es inmutable: nadie puede editarlo ni borrarlo desde aquí.
          </p>
        </div>
        <button
          ij-button
          type="button"
          variant="soft"
          shape="rounded"
          (click)="facade.load()"
          [disabled]="facade.loading()"
        >
          <ij-icon name="calendar" [size]="16" />
          Actualizar
        </button>
      </header>

      <!-- Histórico contra vigente -->
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        @for (card of cards(); track card.label) {
          <div class="rounded-xl border border-line bg-white px-4 py-3.5 shadow-card">
            <p class="text-[12.5px] font-medium text-muted">{{ card.label }}</p>
            <p class="mt-1 text-2xl font-semibold text-ink-900">{{ card.value }}</p>
            @if (card.note) {
              <p class="mt-0.5 text-[12px] leading-snug text-muted">{{ card.note }}</p>
            }
          </div>
        }
      </div>

      <!--
        Barra de filtros.

        Sigue el patrón de users-filters y companies-filters: controles de
        42 px (la altura de ijControlClass, para que el ij-select no se
        desalinee), botones nativos en lugar de ij-button y «Limpiar» sólo
        cuando hay algo que limpiar.

        Va en su propia tarjeta y no empotrada como franja de la tabla porque
        aquí los filtros están sobre los KPI: leer «90 términos vigentes» con
        un filtro de «rechazado» activo por debajo sería engañoso.
      -->
      <form
        class="flex flex-wrap items-center gap-2.5 rounded-xl border border-line bg-white px-4 py-3.5"
        (ngSubmit)="facade.search()"
      >
        <label
          class="flex h-[42px] min-w-[240px] flex-1 items-center gap-2 rounded-xl border border-line bg-white px-3 text-muted focus-within:border-brand"
        >
          <span class="sr-only">Buscar por correo del titular</span>
          <ij-icon name="search" [size]="16" />
          <input
            type="search"
            name="search"
            placeholder="Buscar por correo del titular…"
            class="min-w-0 flex-1 border-0 bg-transparent p-0 text-[13.5px] font-medium text-ink-900 placeholder:text-muted focus:border-0 focus:outline-none focus:ring-0"
            [ngModel]="facade.searchTerm()"
            (ngModelChange)="facade.searchTerm.set($event)"
          />
        </label>

        <ij-select
          class="w-[230px]"
          name="document"
          placeholder="Todos los documentos"
          [options]="documentOptions()"
          [ngModel]="facade.documentCode() ?? ''"
          (ngModelChange)="onDocumentChange($event)"
        />

        <ij-select
          class="w-[190px]"
          name="result"
          placeholder="Todas las decisiones"
          [options]="resultOptions()"
          [ngModel]="resultValue()"
          (ngModelChange)="onResultChange($event)"
        />

        <button
          type="submit"
          class="h-[42px] rounded-xl bg-brand-700 px-4 text-[13px] font-bold text-white transition-colors hover:bg-brand-strong active:translate-y-px"
        >
          Aplicar
        </button>

        @if (hasFilters()) {
          <button
            type="button"
            class="h-[42px] rounded-xl px-3 text-[13px] font-bold text-brand-strong transition-colors hover:bg-brand-50"
            (click)="facade.clearFilters()"
          >
            Limpiar
          </button>
        }
      </form>

      @if (facade.error(); as message) {
        <app-admin-error [message]="message" />
      }

      @if (facade.loading()) {
        <app-admin-table-skeleton [rows]="6" />
      } @else if (facade.items().length === 0) {
        <app-admin-empty
          [message]="'No hay decisiones que coincidan'"
          [hint]="'Cambia los filtros, o revisa que las personas estén aceptando los documentos en el alta.'"
        />
      } @else {
        <ij-table
          [data]="facade.items()"
          [columns]="columns"
          sortMode="server"
          [sort]="sort()"
          (sortChange)="applySort($event)"
        >
          <ng-template ijCell="subject" [ijCellOf]="facade.items()" let-row>
            <div class="min-w-0">
              <div class="truncate text-sm font-semibold text-ink-900">
                {{ row.subjectEmail ?? '—' }}
              </div>
              <div class="text-[12px] text-muted">
                {{ row.hasSession ? 'Cuenta registrada' : 'Visitante sin cuenta' }}
              </div>
            </div>
          </ng-template>

          <ng-template ijCell="document" [ijCellOf]="facade.items()" let-row>
            <div class="text-sm font-medium text-ink-900">
              {{ documentLabel(row.documentCode) }}
            </div>
            <div class="text-[12px] text-muted">v{{ row.documentVersion }}</div>
          </ng-template>

          <ng-template ijCell="decision" [ijCellOf]="facade.items()" let-row>
            <span
              class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold"
              [class]="
                row.granted
                  ? 'bg-accent-green-soft text-accent-green-strong'
                  : 'bg-accent-pink-soft text-accent-pink-strong'
              "
            >
              <ij-icon [name]="row.granted ? 'check' : 'close'" [size]="13" />
              {{
                row.granted
                  ? 'Aceptado'
                  : 'Rechazado'
              }}
            </span>
          </ng-template>

          <ng-template ijCell="method" [ijCellOf]="facade.items()" let-row>
            <div class="text-sm text-body">{{ methodLabel(row.consentMethod) }}</div>
            <div class="text-[12px] text-muted">{{ sourceLabel(row.source) }}</div>
          </ng-template>

          <ng-template ijCell="origin" [ijCellOf]="facade.items()" let-row>
            <div class="font-mono text-[12.5px] text-body">{{ row.ip ?? '—' }}</div>
            @if (row.userAgent; as ua) {
              <div class="max-w-[220px] truncate text-[12px] text-muted" [title]="ua">
                {{ ua }}
              </div>
            }
          </ng-template>

          <ng-template ijCell="consentedAt" [ijCellOf]="facade.items()" let-row>
            <time [attr.datetime]="row.consentedAt" class="text-sm text-body">
              {{ row.consentedAt | date: 'dd/MM/yyyy HH:mm' }}
            </time>
          </ng-template>

          <ng-template ijCell="actions" [ijCellOf]="facade.items()" let-row>
            <button
              ij-button
              type="button"
              variant="soft"
              shape="circle"
              size="sm"
              [attr.aria-label]="'Ver detalle'"
              (click)="openDetail(row)"
            >
              <ij-icon name="eye" [size]="15" />
            </button>
          </ng-template>
        </ij-table>

        <app-admin-pagination
          [page]="facade.page()"
          [pages]="facade.pages()"
          [total]="facade.total()"
          [pageSize]="facade.limit()"
          (pageChange)="facade.setPage($event)"
        />
      }

      <!--
        Ficha de la decisión. Es un modal y no una columna más porque el
        contexto es JSON libre: sin formato fijo no se puede pintar en una celda
        sin inventar una estructura que luego no se sostiene.

        El <ij-modal> va DENTRO del @if a propósito: el componente se dibuja en
        cuanto existe en el DOM —no tiene un input 'open'—, así que fuera del
        @if se pintaba siempre y pulsar la X vaciaba el contenido sin cerrar el
        fondo. Es el mismo orden que usa la cola de pagos.
      -->
      @if (detail(); as row) {
        <ij-modal
          [title]="'Ver detalle'"
          [subtitle]="row.subjectEmail ?? ''"
          size="md"
          [scrollable]="true"
          (close)="closeDetail()"
        >
          <dl class="grid gap-x-4 gap-y-3 sm:grid-cols-2">
            <dt class="text-[12.5px] font-medium text-muted">Documento</dt>
            <dd class="text-sm text-body">
              {{ documentLabel(row.documentCode) }} · v{{ row.documentVersion }}
            </dd>

            <dt class="text-[12.5px] font-medium text-muted">Decisión</dt>
            <dd class="text-sm text-body">
              {{ row.granted ? 'Aceptado' : 'Rechazado' }}
            </dd>

            <dt class="text-[12.5px] font-medium text-muted">Consentimiento</dt>
            <dd class="text-sm text-body">{{ methodLabel(row.consentMethod) }}</dd>

            <dt class="text-[12.5px] font-medium text-muted">Origen</dt>
            <dd class="text-sm text-body">{{ sourceLabel(row.source) }}</dd>

            <dt class="text-[12.5px] font-medium text-muted">Momento</dt>
            <dd class="text-sm text-body">
              {{ row.consentedAt | date: 'dd/MM/yyyy HH:mm:ss' }}
            </dd>

            <dt class="text-[12.5px] font-medium text-muted">Dirección IP</dt>
            <dd class="font-mono text-sm text-body">{{ row.ip ?? '—' }}</dd>

            <dt class="text-[12.5px] font-medium text-muted sm:col-span-2">
              Navegador
            </dt>
            <dd class="font-mono text-[12px] break-all text-body sm:col-span-2">
              {{ row.userAgent ?? '—' }}
            </dd>

            @if (row.metadata) {
              <dt class="text-[12.5px] font-medium text-muted sm:col-span-2">
                Contexto
              </dt>
              <dd class="sm:col-span-2">
                <pre
                  class="overflow-x-auto rounded-lg bg-surface p-3 font-mono text-[12px] leading-relaxed text-body"
                  >{{ row.metadata | json }}</pre
                >
              </dd>
            }
          </dl>

          <p
            class="mt-5 rounded-lg border-l-4 border-brand bg-brand-50/60 px-4 py-3 text-[13px] leading-relaxed text-body"
          >
            Esta fila es un hecho pasado y no se modifica. Una revocación no borra
            la aceptación original: inserta una decisión nueva, y el estado
            actual se deduce de la última decisión de cada titular.
          </p>
        </ij-modal>
      }
    </div>
  `,
})
export class LegalConsentsPage {
  protected readonly facade = inject(AdminLegalFacade);

  protected readonly columns: IjColumn<AdminLegalConsent>[] = [
    { id: 'subject', header: 'Titular' },
    { id: 'document', header: 'Documento' },
    { id: 'decision', header: 'Decisión' },
    { id: 'method', header: 'Cómo y dónde', hideBelow: 'md' },
    { id: 'origin', header: 'Procedencia', hideBelow: 'lg' },
    { id: 'consentedAt', header: 'Cuándo', sortable: true },
    { id: 'actions', header: '', class: 'text-right' },
  ];

  /** Orden de servidor: sólo se manda si alguien toca una cabecera. */
  protected readonly sort = signal<IjSortState | null>(null);
  protected readonly detail = signal<AdminLegalConsent | null>(null);

  /**
   * «Limpiar» sólo aparece cuando hay algo que limpiar.
   *
   * Igual que en `users-filters` y `companies-filters`: un botón de limpiar que
   * no hace nada parece un botón roto. Se lee de los signals del buscador, sin
   * preguntar a la fachada, para no depender del estado de la petición.
   */
  protected readonly hasFilters = computed(
    () =>
      this.facade.searchTerm().trim().length > 0 ||
      this.facade.documentCode() !== undefined ||
      this.facade.granted() !== undefined,
  );

  protected readonly documentOptions = computed(() => [
    { value: '', label: 'Todos los documentos' },
    ...CONSENT_DOCUMENT_FILTERS.map((doc) => ({
      value: doc.value,
      label: doc.label,
    })),
  ]);

  protected readonly resultOptions = computed(() => [
    { value: 'ALL', label: 'Todas las decisiones' },
    { value: 'GRANTED', label: 'Aceptado' },
    { value: 'DENIED', label: 'Rechazado' },
  ]);

  protected readonly resultValue = computed(() => {
    const granted = this.facade.granted();
    if (granted === true) return 'GRANTED';
    if (granted === false) return 'DENIED';
    return 'ALL';
  });

  /**
   * Las tres cifras *vigentes* vienen del backend porque no se pueden calcular en
   * el cliente: haría falta el historial entero para saber si una aceptación fue
   * revocada después.
   */
  protected readonly cards = computed(() => {
    const s = this.facade.summary();

return [
      {
        label: 'Decisiones registradas',
        value: s.total,
        note: `${s.granted} aceptadas · ${s.denied} rechazadas`,
      },
      {
        label: 'Términos vigentes',
        value: s.activeTerms,
        note: 'Titulares con la última decisión en «aceptado»',
      },
      {
        label: 'Aviso de privacidad vigente',
        value: s.activePrivacy,
        note: 'Titulares con la última decisión en «aceptado»',
      },
      {
        label: 'Cesión de imagen vigente',
        value: s.activeImageRights,
        note: 'Autorizan que se muestre su fotografía',
      },
    ];
  });

  constructor() {
    this.facade.load();
  }

  protected onDocumentChange(value: string): void {
    this.facade.documentCode.set(
      value ? (value as LegalDocCodeWire) : undefined,
    );
  }

  protected onResultChange(value: string): void {
    this.facade.granted.set(
      value === 'GRANTED' ? true : value === 'DENIED' ? false : undefined,
    );
  }

  protected applySort(sort: IjSortState | null): void {
    this.sort.set(sort);
    this.facade.setPage(1);
  }

  protected openDetail(row: AdminLegalConsent): void {
    this.detail.set(row);
  }

  protected closeDetail(): void {
    this.detail.set(null);
  }

  protected documentLabel(code: LegalDocCodeWire): string {
    return (
      CONSENT_DOCUMENT_FILTERS.find((doc) => doc.value === code)?.label ?? code
    );
  }

  protected sourceLabel(source: ConsentSourceWire): string {
    return CONSENT_SOURCE_LABELS[source] ?? source;
  }

  protected methodLabel(method: AdminLegalConsent['consentMethod']): string {
    return CONSENT_METHOD_LABELS[method] ?? method;
  }
}