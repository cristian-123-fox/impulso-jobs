import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LocaleFormatService } from '@/core/i18n/locale-format.service';
import { ApiErrorResponse } from '@/core/models/api-response.models';
import { AdminConfirm } from '@/features/admin/shared/admin-confirm/admin-confirm';
import { AdminEmpty } from '@/features/admin/shared/admin-empty/admin-empty';
import { AdminError } from '@/features/admin/shared/admin-error/admin-error';
import { AdminPagination } from '@/features/admin/shared/admin-pagination/admin-pagination';
import { AdminTableSkeleton } from '@/features/admin/shared/admin-table-skeleton/admin-table-skeleton';
import { PaymentsApi } from '@/features/admin/payments/data/payments.api';
import {
  AdminPayment,
  AdminPaymentFilter,
  OPEN_PAYMENT_STATUSES,
  PAYMENT_METHOD_LABELS,
  PAYMENT_PROVIDER_LABELS,
  PAYMENT_STATUS_LABELS,
  orderFolio,
} from '@/features/admin/payments/models/payments.models';
import {
  IjCell,
  IjColumn,
  IjIcon,
  IjModal,
  IjSortState,
  IjTable,
  IjTextarea,
} from '@/shared/ui';

const PAGE_SIZE = 10;

/**
 * Cola de cobros. Una **solicitud de pago** se queda "esperando pago" hasta que
 * alguien del equipo verifica la transferencia y la confirma aquí. Confirmar
 * activa lo comprado; rechazar lo cancela y deja a la empresa libre para
 * volver a contratar. Las dos cosas le llegan como notificación.
 *
 * Un cobro de **Stripe** se confirma solo por webhook, así que no se ofrece
 * "Confirmar" —activaría sin cobro—: se ofrece "Sincronizar" (preguntarle a
 * Stripe, por si el webhook no llegó) y "Anular" (expirar un Checkout
 * abandonado para liberar la reserva).
 *
 * Orden **de servidor**: los ids ordenables son los de
 * `ADMIN_PAYMENT_SORT_COLUMNS` en el backend.
 */
@Component({
  selector: 'app-payments-list-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    AdminConfirm,
    AdminEmpty,
    AdminError,
    AdminPagination,
    AdminTableSkeleton,
    IjCell,
    IjIcon,
    IjModal,
    IjTable,
    IjTextarea,
  ],
  template: `
    <div class="mx-auto flex max-w-[1240px] flex-col gap-5">
      <div>
        <h1 class="text-[28px] font-extrabold leading-tight tracking-tight text-ink-900">
          Pagos
        </h1>
        <p class="mt-1.5 text-[14px] font-medium text-muted">
          Compras de promociones y suscripciones. Confirma un pago cuando hayas verificado el
          cobro: en ese momento se activa lo que la empresa contrató.
        </p>
      </div>

      <!-- Como en app-users-tabs: con -mb-px hace falta overflow-y-hidden. -->
      <div
        role="tablist"
        class="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-line"
      >
        @for (tab of tabs; track tab.value) {
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="status() === tab.value"
            [class]="tabClass(tab.value)"
            (click)="filter(tab.value)"
          >
            {{ tab.label }}
          </button>
        }
      </div>

      @if (actionError(); as message) {
        <p role="alert" class="rounded-xl bg-red-50 px-4 py-3 text-[13.5px] font-medium text-red-700">
          {{ message }}
        </p>
      }

      <section class="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
        @switch (state()) {
          @case ('loading') {
            <app-admin-table-skeleton [bare]="true" label="Cargando pagos…" />
          }
          @case ('error') {
            <app-admin-error
              [bare]="true"
              message="No se pudieron cargar los pagos."
              (retry)="load(page())"
            />
          }
          @default {
            @if (payments().length === 0) {
              <app-admin-empty
                icon="credit-card"
                [message]="
                  status() === 'OPEN'
                    ? 'No hay pagos pendientes de confirmar.'
                    : 'No hay pagos con este filtro.'
                "
                hint="Cada compra de una empresa aparece aquí hasta que se confirma o se rechaza."
              />
            } @else {
              <ij-table
                [data]="payments()"
                [columns]="columns"
                sortMode="server"
                [bare]="true"
                [rowId]="rowId"
                [sort]="sort()"
                (sortChange)="applySort($event)"
              >
                <ng-template ijCell="concept" [ijCellOf]="payments()" let-payment>
                  <div class="min-w-0">
                    <div class="truncate text-sm font-semibold text-ink-900">
                      {{ payment.companyName ?? 'Empresa eliminada' }}
                    </div>
                    <div class="truncate text-[12.5px] text-muted">
                      @if (payment.kind === 'PROMOTION') {
                        Promoción {{ payment.planName ?? '' }} ·
                        @if (payment.vacancyTitle) {
                          <a
                            [routerLink]="['/vacantes', payment.vacancyId]"
                            class="hover:text-brand-strong"
                          >
                            {{ payment.vacancyTitle }}
                          </a>
                        } @else {
                          vacante eliminada
                        }
                      } @else {
                        Suscripción {{ payment.planName ?? '' }}
                      }
                    </div>
                  </div>
                </ng-template>

                <ng-template ijCell="folio" [ijCellOf]="payments()" let-payment>
                  <span
                    class="rounded-md bg-surface px-2 py-1 font-mono text-[12px] font-bold text-body"
                    [title]="payment.externalReference ?? ''"
                  >
                    {{ folio(payment.id) }}
                  </span>
                </ng-template>

                <ng-template ijCell="total" [ijCellOf]="payments()" let-payment>
                  <div class="text-sm font-bold text-ink-900">{{ money(payment.total) }}</div>
                  <div class="flex items-center gap-1.5 text-[12px] text-muted">
                    <span
                      class="rounded px-1.5 py-px text-[10.5px] font-bold"
                      [class]="
                        payment.provider === 'stripe'
                          ? 'bg-[#efeafd] text-[#5b3cc4]'
                          : 'bg-surface text-body'
                      "
                    >
                      {{ providerLabel(payment.provider) }}
                    </span>
                    {{ methodLabel(payment.paymentMethod) }}
                  </div>
                </ng-template>

                <ng-template ijCell="paymentStatus" [ijCellOf]="payments()" let-payment>
                  <span
                    class="inline-block rounded-md px-2 py-1 text-[11.5px] font-bold"
                    [class]="statusClass(payment.paymentStatus)"
                  >
                    {{ statusLabel(payment.paymentStatus) }}
                  </span>
                  @if (payment.paidAt) {
                    <div class="mt-1 text-[11.5px] text-muted">
                      {{ payment.paidAt | date: 'dd MMM yyyy' }}
                    </div>
                  }
                </ng-template>

                <ng-template ijCell="createdAt" [ijCellOf]="payments()" let-payment>
                  <span class="text-[13px] text-muted">
                    {{ payment.createdAt | date: 'dd MMM yyyy, HH:mm' }}
                  </span>
                </ng-template>

                <ng-template ijCell="actions" [ijCellOf]="payments()" let-payment>
                  @if (isOpen(payment)) {
                    <div class="flex items-center justify-end gap-1.5">
                      @if (payment.provider === 'manual') {
                        <button
                          type="button"
                          class="flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-[12.5px] font-bold text-body transition-colors hover:bg-surface hover:text-accent-green-strong active:translate-y-[1px] disabled:opacity-50"
                          [disabled]="busyId() === payment.id"
                          (click)="confirming.set(payment)"
                        >
                          <ij-icon name="check" [size]="14" />
                          Confirmar
                        </button>
                      } @else {
                        <button
                          type="button"
                          class="flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-[12.5px] font-bold text-body transition-colors hover:bg-surface hover:text-brand-strong active:translate-y-[1px] disabled:opacity-50"
                          title="Consultar a Stripe el estado real del cobro"
                          [disabled]="busyId() === payment.id"
                          (click)="sync(payment)"
                        >
                          <ij-icon name="history" [size]="14" />
                          Sincronizar
                        </button>
                      }
                      <button
                        type="button"
                        class="flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-[12.5px] font-bold text-body transition-colors hover:bg-red-50 hover:text-red-600 active:translate-y-[1px] disabled:opacity-50"
                        [disabled]="busyId() === payment.id"
                        (click)="openReject(payment)"
                      >
                        <ij-icon name="x" [size]="14" />
                        {{ payment.provider === 'manual' ? 'Rechazar' : 'Anular' }}
                      </button>
                    </div>
                  }
                </ng-template>
              </ij-table>
            }

            <app-admin-pagination
              [inCard]="true"
              [page]="page()"
              [pages]="pages()"
              [total]="total()"
              (pageChange)="load($event)"
            />
          }
        }
      </section>
    </div>

    @if (confirming(); as payment) {
      <app-admin-confirm
        title="Confirmar pago"
        [message]="confirmMessage(payment)"
        confirmLabel="Confirmar pago"
        tone="primary"
        (confirm)="confirm(payment)"
        (cancel)="confirming.set(null)"
      />
    }

    @if (rejecting(); as payment) {
      <ij-modal
        title="Rechazar pago"
        [subtitle]="(payment.companyName ?? 'Empresa') + ' · ' + money(payment.total)"
        size="sm"
        (close)="rejecting.set(null)"
      >
        <p class="text-[13.5px] leading-relaxed text-body">
          La compra se cancela y la empresa podrá volver a contratarla. Le avisaremos con el
          motivo que escribas.
          @if (payment.provider === 'stripe') {
            El enlace de pago de Stripe deja de funcionar.
          }
        </p>
        <div class="mt-4">
          <ij-textarea
            label="Motivo (opcional)"
            name="reason"
            [rows]="3"
            [maxLength]="300"
            hint="Por ejemplo: «No recibimos la transferencia»."
            [(ngModel)]="rejectReason"
          />
        </div>
        <div class="mt-6 flex justify-end gap-3 border-t border-line pt-4">
          <button
            type="button"
            class="rounded-xl border border-line bg-white px-4 py-2.5 text-[13.5px] font-bold text-body transition-colors hover:bg-surface"
            (click)="rejecting.set(null)"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="rounded-xl bg-red-600 px-4 py-2.5 text-[13.5px] font-bold text-white transition-colors hover:bg-red-700 active:translate-y-[1px] disabled:opacity-50"
            [disabled]="busyId() === payment.id"
            (click)="reject(payment)"
          >
            Rechazar pago
          </button>
        </div>
      </ij-modal>
    }
  `,
})
export class PaymentsListPage {
  private readonly api = inject(PaymentsApi);
  private readonly format = inject(LocaleFormatService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly tabs: readonly { value: AdminPaymentFilter; label: string }[] = [
    { value: 'OPEN', label: 'Por confirmar' },
    { value: 'PAID', label: 'Pagados' },
    { value: 'FAILED', label: 'Rechazados' },
    { value: '', label: 'Todos' },
  ];

  protected readonly columns: IjColumn<AdminPayment>[] = [
    { id: 'concept', header: 'Empresa y concepto' },
    { id: 'folio', header: 'Folio', hideBelow: 'md' },
    { id: 'total', header: 'Importe', sortable: true },
    { id: 'paymentStatus', header: 'Estado', sortable: true },
    { id: 'createdAt', header: 'Fecha', sortable: true, hideBelow: 'lg' },
    { id: 'actions', header: '', class: 'text-right' },
  ];

  protected readonly rowId = (payment: AdminPayment) => payment.id;

  protected readonly payments = signal<AdminPayment[]>([]);
  protected readonly state = signal<'loading' | 'loaded' | 'error'>('loading');
  protected readonly status = signal<AdminPaymentFilter>('OPEN');
  protected readonly sort = signal<IjSortState | null>(null);
  protected readonly page = signal(1);
  protected readonly pages = signal(1);
  protected readonly total = signal(0);
  protected readonly actionError = signal<string | null>(null);

  protected readonly confirming = signal<AdminPayment | null>(null);
  protected readonly rejecting = signal<AdminPayment | null>(null);
  protected readonly rejectReason = signal('');
  /** Orden con una acción en curso: evita el doble clic. */
  protected readonly busyId = signal<string | null>(null);

  constructor() {
    this.load(1);
  }

  protected load(page: number): void {
    this.state.set('loading');
    this.api
      .list({
        page,
        limit: PAGE_SIZE,
        status: this.status(),
        sort: this.sort(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.payments.set(result.items);
          this.page.set(result.page);
          this.pages.set(result.pages);
          this.total.set(result.total);
          this.state.set('loaded');
        },
        error: () => this.state.set('error'),
      });
  }

  protected filter(status: AdminPaymentFilter): void {
    this.status.set(status);
    this.load(1);
  }

  protected applySort(sort: IjSortState | null): void {
    this.sort.set(sort);
    this.load(1);
  }

  protected openReject(payment: AdminPayment): void {
    this.rejectReason.set('');
    this.rejecting.set(payment);
  }

  protected sync(payment: AdminPayment): void {
    this.run(payment, this.api.sync(payment.id), 'No se pudo consultar el pago en Stripe.');
  }

  protected confirm(payment: AdminPayment): void {
    this.confirming.set(null);
    this.run(payment, this.api.confirm(payment.id), 'No se pudo confirmar el pago.');
  }

  protected reject(payment: AdminPayment): void {
    const reason = this.rejectReason().trim();
    this.rejecting.set(null);
    this.run(
      payment,
      this.api.reject(payment.id, reason || undefined),
      'No se pudo rechazar el pago.',
    );
  }

  protected confirmMessage(payment: AdminPayment): string {
    const what =
      payment.kind === 'PROMOTION'
        ? `la promoción ${payment.planName ?? ''} de «${payment.vacancyTitle ?? 'la vacante'}»`
        : `la suscripción ${payment.planName ?? ''}`;
    return (
      `Confirma sólo si ya verificaste el cobro de ${this.money(payment.total)} ` +
      `(folio ${this.folio(payment.id)}). Se activará ${what} de ` +
      `${payment.companyName ?? 'la empresa'} y se le avisará.`
    );
  }

  protected isOpen(payment: AdminPayment): boolean {
    return OPEN_PAYMENT_STATUSES.includes(payment.paymentStatus);
  }

  protected folio(id: string): string {
    return orderFolio(id);
  }

  protected money(amount: number): string {
    return this.format.currency(amount, 2);
  }

  protected providerLabel(provider: string): string {
    return PAYMENT_PROVIDER_LABELS[provider] ?? provider;
  }

  protected methodLabel(method: string): string {
    return PAYMENT_METHOD_LABELS[method] ?? method;
  }

  protected statusLabel(status: string): string {
    return PAYMENT_STATUS_LABELS[status] ?? status;
  }

  protected statusClass(status: string): string {
    if (status === 'PAID') return 'bg-accent-green-soft text-accent-green-strong';
    if (OPEN_PAYMENT_STATUSES.includes(status)) {
      return 'bg-accent-amber-soft text-accent-amber-strong';
    }
    if (status === 'FAILED') return 'bg-red-50 text-red-700';
    return 'bg-surface text-muted';
  }

  /** Mismas clases que `app-users-tabs`: el back-office subraya, no apastilla. */
  protected tabClass(value: AdminPaymentFilter): string {
    const base =
      'flex flex-shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3.5 pb-3 pt-2.5 ' +
      '-mb-px text-[13.5px] font-bold transition-colors';
    return this.status() === value
      ? `${base} border-brand text-brand-strong`
      : `${base} border-transparent text-muted hover:text-ink-900`;
  }

  private run(
    payment: AdminPayment,
    request: ReturnType<PaymentsApi['confirm']>,
    fallback: string,
  ): void {
    this.actionError.set(null);
    this.busyId.set(payment.id);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.busyId.set(null);
        this.load(this.page());
      },
      error: (error: unknown) => {
        this.busyId.set(null);
        this.actionError.set(this.messageOf(error, fallback));
        // Otro administrador pudo cerrarla antes: se refresca para que se vea.
        this.load(this.page());
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
