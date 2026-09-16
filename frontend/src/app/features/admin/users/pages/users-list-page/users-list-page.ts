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
import { concat, last, Observable } from 'rxjs';
import { AuthService } from '@/core/auth/auth.service';
import { ApiErrorResponse } from '@/core/models/api-response.models';
import { Role } from '@/core/models/role.enum';
import { IjButton, IjIcon, IjModal } from '@/shared/ui';
import { AdminConfirm } from '@/features/admin/shared/admin-confirm/admin-confirm';
import { AdminError } from '@/features/admin/shared/admin-error/admin-error';
import { AdminPagination } from '@/features/admin/shared/admin-pagination/admin-pagination';
import { AdminTableSkeleton } from '@/features/admin/shared/admin-table-skeleton/admin-table-skeleton';
import { UsersFacade } from '@/features/admin/users/data/users.facade';
import { UsersFilters } from '@/features/admin/users/components/users-filters/users-filters';
import { UsersTabs } from '@/features/admin/users/components/users-tabs/users-tabs';
import { UsersTable } from '@/features/admin/users/components/users-table/users-table';
import { UserCreateForm } from '@/features/admin/users/components/user-create-form/user-create-form';
import {
  UserEditForm,
  UserEditResult,
} from '@/features/admin/users/components/user-edit-form/user-edit-form';
import {
  AdminUser,
  CreateUserPayload,
  UserStatus,
} from '@/features/admin/users/models/users.models';

/** Título del alta según la pestaña desde la que se abre el modal. */
const CREATE_TITLE: Record<Role, string> = {
  [Role.EMPLOYER]: 'Nuevo usuario de empresa',
  [Role.CANDIDATE]: 'Nuevo aspirante',
  [Role.ADMIN]: 'Nuevo personal administrativo',
};

@Component({
  selector: 'app-users-list-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AdminConfirm,
    AdminError,
    AdminPagination,
    AdminTableSkeleton,
    UsersFilters,
    UsersTabs,
    UsersTable,
    UserCreateForm,
    UserEditForm,
    IjButton,
    IjIcon,
    IjModal,
  ],
  template: `
    <div class="mx-auto flex max-w-[1240px] flex-col gap-5">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="text-[28px] font-extrabold leading-tight tracking-tight text-ink-900">
            Usuarios
          </h1>
          <p class="mt-1.5 text-[14px] font-medium text-muted">
            Cuentas separadas por tipo: empresas, aspirantes y personal administrativo.
          </p>
        </div>
        <button
          ij-button
          type="button"
          variant="primary"
          shape="rounded"
          size="sm"
          (click)="openCreate()"
        >
          <ij-icon name="plus" [size]="16" [strokeWidth]="2.5" />
          {{ createLabel() }}
        </button>
      </div>

      <app-users-tabs
        [active]="facade.role()"
        [stats]="facade.stats()"
        (select)="facade.selectRole($event)"
      />

      @if (actionError(); as message) {
        <p
          role="alert"
          class="rounded-xl bg-red-50 px-4 py-3 text-[13.5px] font-medium text-red-700"
        >
          {{ message }}
        </p>
      }

      <!--
        Una sola caja para filtros, tabla y paginación: los tres operan sobre el
        mismo listado, así que separarlos en tarjetas sueltas los hacía leer
        como bloques sin relación.
      -->
      <section class="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
        <app-users-filters
          class="border-b border-line"
          [(search)]="facade.search"
          [(status)]="facade.status"
          (apply)="facade.applyFilters()"
          (clear)="facade.clearFilters()"
        />

        @if (selection().length > 0) {
          <div class="flex flex-wrap items-center gap-3 border-b border-line bg-brand-50 px-4 py-3">
            <span class="text-[13.5px] font-bold text-brand-strong">
              {{ selection().length }}
              {{ selection().length === 1 ? 'cuenta seleccionada' : 'cuentas seleccionadas' }}
            </span>
            <div class="ml-auto flex flex-wrap gap-2">
              <button
                type="button"
                class="rounded-lg border border-line bg-white px-3 py-1.5 text-[13px] font-bold text-body transition-colors hover:bg-surface active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
                [disabled]="bulkRunning()"
                (click)="onBulkStatus(active)"
              >
                Reactivar
              </button>
              <button
                type="button"
                class="rounded-lg border border-line bg-white px-3 py-1.5 text-[13px] font-bold text-body transition-colors hover:bg-surface hover:text-red-600 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
                [disabled]="bulkRunning()"
                (click)="onBulkStatus(inactive)"
              >
                Desactivar
              </button>
            </div>
          </div>
        }

        @switch (facade.state()) {
          @case ('loading') {
            <app-admin-table-skeleton [bare]="true" label="Cargando usuarios…" />
          }
          @case ('error') {
            <app-admin-error
              [bare]="true"
              message="No se pudieron cargar los usuarios."
              (retry)="facade.load(facade.page())"
            />
          }
          @default {
            <app-users-table
              [users]="facade.users()"
              [role]="facade.role()"
              [currentUserId]="currentUserId()"
              [sort]="facade.sort()"
              (sortChange)="facade.applySort($event)"
              (selectionChange)="selection.set($event)"
              (edit)="onEdit($event)"
              (activate)="onStatus($event, active)"
              (deactivate)="onStatus($event, inactive)"
              (remove)="onRemove($event)"
            />
            <app-admin-pagination
              [inCard]="true"
              [page]="facade.page()"
              [pages]="facade.pages()"
              [total]="facade.total()"
              [pageSize]="facade.pageSize()"
              (pageChange)="facade.load($event)"
              (pageSizeChange)="facade.applyPageSize($event)"
            />
          }
        }
      </section>
    </div>

    @if (showCreate()) {
      <ij-modal
        size="lg"
        [scrollable]="true"
        [title]="createLabel()"
        subtitle="Se crea verificada y activa. Podrá iniciar sesión en cuanto la guardes."
        (close)="closeForms()"
      >
        <app-user-create-form
          [initialRole]="facade.role()"
          [submitting]="saving()"
          [error]="formError()"
          (create)="onCreate($event)"
          (cancel)="closeForms()"
        />
      </ij-modal>
    }

    @if (editing(); as user) {
      <ij-modal
        size="lg"
        [scrollable]="true"
        title="Editar usuario"
        [subtitle]="user.displayName || user.email"
        (close)="closeForms()"
      >
        <app-user-edit-form
          [user]="user"
          [isSelf]="user.id === currentUserId()"
          [submitting]="saving()"
          [error]="formError()"
          (save)="onUpdate(user, $event)"
          (cancel)="closeForms()"
        />
      </ij-modal>
    }

    @if (removing(); as user) {
      <app-admin-confirm
        title="Eliminar cuenta"
        [message]="removeMessage(user)"
        confirmLabel="Eliminar cuenta"
        (confirm)="onRemoveConfirmed(user)"
        (cancel)="removing.set(null)"
      />
    }
  `,
})
export class UsersListPage {
  protected readonly facade = inject(UsersFacade);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly active = UserStatus.ACTIVE;
  protected readonly inactive = UserStatus.INACTIVE;

  protected readonly showCreate = signal(false);
  protected readonly editing = signal<AdminUser | null>(null);
  protected readonly removing = signal<AdminUser | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  /** Filas marcadas en la tabla, para las acciones en lote. */
  protected readonly selection = signal<readonly AdminUser[]>([]);
  protected readonly bulkRunning = signal(false);

  protected readonly currentUserId = computed(
    () => this.auth.currentUser()?.id ?? null,
  );

  protected readonly createLabel = computed(
    () => CREATE_TITLE[this.facade.role()],
  );

  constructor() {
    this.facade.load(1);
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.formError.set(null);
    this.showCreate.set(true);
  }

  protected onEdit(user: AdminUser): void {
    this.showCreate.set(false);
    this.formError.set(null);
    this.editing.set(user);
  }

  protected closeForms(): void {
    this.showCreate.set(false);
    this.editing.set(null);
    this.formError.set(null);
  }

  protected onCreate(payload: CreateUserPayload): void {
    this.saving.set(true);
    this.formError.set(null);
    this.facade
      .create(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created) => {
          this.saving.set(false);
          this.closeForms();
          // El alta puede ser de un tipo distinto al de la pestaña activa.
          this.showIn(created.role);
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.formError.set(this.messageOf(error, 'No se pudo crear el usuario.'));
        },
      });
  }

  /**
   * La cuenta y sus roles viven en endpoints distintos: se encadenan en orden
   * y se toma el último resultado, que ya refleja ambos cambios.
   */
  protected onUpdate(user: AdminUser, result: UserEditResult): void {
    const requests: Observable<AdminUser>[] = [];
    if (Object.keys(result.changes).length > 0) {
      requests.push(this.facade.update(user.id, result.changes));
    }
    if (result.extraRoleIds) {
      requests.push(this.facade.setRoles(user.id, result.extraRoleIds));
    }
    if (requests.length === 0) {
      this.closeForms();
      return;
    }

    this.saving.set(true);
    this.formError.set(null);
    concat(...requests)
      .pipe(last(), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.saving.set(false);
          this.closeForms();
          // Cambiar el rol mueve la cuenta a otra pestaña: se recarga el listado.
          if (updated.role !== user.role) {
            this.showIn(updated.role);
          } else {
            this.facade.replace(updated);
          }
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.formError.set(
            this.messageOf(error, 'No se pudo actualizar el usuario.'),
          );
        },
      });
  }

  protected onStatus(user: AdminUser, status: UserStatus): void {
    this.actionError.set(null);
    this.facade
      .updateStatus(user.id, status)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => this.facade.replace(updated),
        error: (error: unknown) =>
          this.actionError.set(
            this.messageOf(error, 'No se pudo cambiar el estado.'),
          ),
      });
  }

  /**
   * Cambia el estado de todas las cuentas marcadas. Se excluye la propia
   * sesión: el backend rechaza que un administrador se desactive a sí mismo,
   * y sin filtrarlo aquí el lote entero fallaría por una sola fila.
   *
   * Las peticiones van en serie (`concat`) y no en paralelo: son 10 como
   * mucho y así un fallo intermedio no deja la mitad aplicada sin saber cuál.
   */
  protected onBulkStatus(status: UserStatus): void {
    const targets = this.selection().filter(
      (user) => user.id !== this.currentUserId() && user.status !== status,
    );
    if (targets.length === 0) {
      this.actionError.set('Las cuentas seleccionadas ya están en ese estado.');
      return;
    }

    this.actionError.set(null);
    this.bulkRunning.set(true);
    concat(
      ...targets.map((user) => this.facade.updateStatus(user.id, status)),
    )
      .pipe(last(), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.bulkRunning.set(false);
          this.selection.set([]);
          this.facade.load(this.facade.page());
        },
        error: (error: unknown) => {
          this.bulkRunning.set(false);
          this.actionError.set(
            this.messageOf(error, 'No se pudo cambiar el estado de todas.'),
          );
          // Algunas sí pudieron cambiar: hay que recargar para no mentir.
          this.facade.load(this.facade.page());
        },
      });
  }

  protected onRemove(user: AdminUser): void {
    this.removing.set(user);
  }

  protected removeMessage(user: AdminUser): string {
    const label = user.displayName || user.email;
    return `¿Eliminar la cuenta de ${label}? Esta acción da de baja al usuario.`;
  }

  protected onRemoveConfirmed(user: AdminUser): void {
    this.removing.set(null);
    this.actionError.set(null);
    this.facade
      .remove(user.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.facade.load(this.facade.page()),
        error: (error: unknown) =>
          this.actionError.set(
            this.messageOf(error, 'No se pudo eliminar el usuario.'),
          ),
      });
  }

  /**
   * Deja visible la pestaña del rol dado y recarga desde la primera página.
   * `selectRole` ya recarga cuando cambia de pestaña; sólo hay que recargar
   * cuando la cuenta afectada pertenece a la pestaña actual.
   */
  private showIn(role: Role): void {
    if (role === this.facade.role()) {
      this.facade.load(1);
      return;
    }
    this.facade.selectRole(role);
  }

  /** El backend ya envía mensajes en español; se usa el suyo cuando existe. */
  private messageOf(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as ApiErrorResponse | null;
      return body?.errors?.[0]?.message ?? body?.message ?? fallback;
    }
    return fallback;
  }
}
