import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { ApiErrorResponse } from '@/core/models/api-response.models';
import { IjButton, IjIcon, IjModal } from '@/shared/ui';
import { AdminConfirm } from '@/features/admin/shared/admin-confirm/admin-confirm';
import { AdminError } from '@/features/admin/shared/admin-error/admin-error';
import { AdminTableSkeleton } from '@/features/admin/shared/admin-table-skeleton/admin-table-skeleton';
import { RolesFacade } from '@/features/admin/roles/data/roles.facade';
import {
  CreateRolePayload,
  RoleSummary,
} from '@/features/admin/roles/models/roles.models';
import {
  RoleActionEvent,
  RolesTable,
} from '@/features/admin/roles/components/roles-table/roles-table';
import { RoleForm } from '@/features/admin/roles/components/role-form/role-form';

@Component({
  selector: 'app-roles-list-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AdminConfirm,
    AdminError,
    AdminTableSkeleton,
    RolesTable,
    RoleForm,
    IjButton,
    IjIcon,
    IjModal,
  ],
  template: `
    <div class="mx-auto max-w-[1100px]">
      <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="text-2xl font-extrabold tracking-tight text-ink-900">Roles y permisos</h1>
          <p class="mt-1.5 text-[13.5px] text-muted">
            Administra los roles de la plataforma y los permisos que otorgan.
          </p>
        </div>
        <button
          ij-button
          type="button"
          variant="primary"
          shape="rounded"
          size="md"
          (click)="openCreate()"
        >
          <ij-icon name="plus" [size]="16" />
          Nuevo rol
        </button>
      </div>

      @if (actionError(); as message) {
        <p
          role="alert"
          class="mb-4 rounded-xl bg-red-50 px-4 py-3 text-[13.5px] font-medium text-red-700"
        >
          {{ message }}
        </p>
      }

      @switch (facade.rolesState()) {
        @case ('loading') {
          <app-admin-table-skeleton label="Cargando roles…" />
        }
        @case ('error') {
          <app-admin-error
            message="No se pudieron cargar los roles."
            (retry)="facade.loadRoles()"
          />
        }
        @default {
          <app-roles-table [roles]="facade.roles()" (action)="onAction($event)" />
        }
      }
    </div>

    @if (formOpen()) {
      <ij-modal
        [title]="editing() ? 'Editar rol' : 'Nuevo rol'"
        [subtitle]="editing()?.name ?? 'Después podrás asignarle permisos.'"
        (close)="closeForm()"
      >
        <app-role-form
          [role]="editing()"
          [submitting]="saving()"
          [error]="formError()"
          (save)="onSave($event)"
          (cancel)="closeForm()"
        />
      </ij-modal>
    }

    @if (removing(); as role) {
      <app-admin-confirm
        title="Eliminar rol"
        [message]="removeMessage(role)"
        confirmLabel="Eliminar rol"
        (confirm)="onRemoveConfirmed(role)"
        (cancel)="removing.set(null)"
      />
    }
  `,
})
export class RolesListPage {
  protected readonly facade = inject(RolesFacade);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly formOpen = signal(false);
  protected readonly editing = signal<RoleSummary | null>(null);
  protected readonly removing = signal<RoleSummary | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);

  constructor() {
    this.facade.loadRoles();
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.formError.set(null);
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.editing.set(null);
    this.formError.set(null);
  }

  protected onAction(event: RoleActionEvent): void {
    const { action, role } = event;
    switch (action) {
      case 'open':
        void this.router.navigate(['/admin/roles', role.id]);
        return;
      case 'edit':
        this.editing.set(role);
        this.formError.set(null);
        this.formOpen.set(true);
        return;
      case 'remove':
        this.removing.set(role);
    }
  }

  protected removeMessage(role: RoleSummary): string {
    return `¿Eliminar el rol "${role.name}"? Se borrarán también sus permisos asignados.`;
  }

  protected onSave(payload: CreateRolePayload): void {
    const editing = this.editing();
    this.saving.set(true);
    this.formError.set(null);

    // Al editar sólo viajan nombre y descripción: el código es inmutable.
    const request: Observable<RoleSummary> = editing
      ? this.facade.updateRole(editing.id, {
          name: payload.name,
          description: payload.description,
        })
      : this.facade.createRole(payload);

    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeForm();
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.formError.set(this.messageOf(error, 'No se pudo guardar el rol.'));
      },
    });
  }

  protected onRemoveConfirmed(role: RoleSummary): void {
    this.removing.set(null);
    this.actionError.set(null);
    this.facade
      .deleteRole(role.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: (error: unknown) =>
          this.actionError.set(
            this.messageOf(error, 'No se pudo eliminar el rol.'),
          ),
      });
  }

  /** El backend ya envía mensajes en español; se usa el suyo cuando existe. */
  private messageOf(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as ApiErrorResponse | null;
      if (body?.errorCode === 'ROLE_ALREADY_EXISTS') {
        return 'Ya existe un rol con ese código.';
      }
      return body?.errors?.[0]?.message ?? body?.message ?? fallback;
    }
    return fallback;
  }
}
