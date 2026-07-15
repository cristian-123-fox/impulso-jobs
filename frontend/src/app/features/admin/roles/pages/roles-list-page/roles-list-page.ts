import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { ApiErrorResponse } from '@/core/models/api-response.models';
import { IjButton, IjIcon } from '@/shared/ui';
import { RolesFacade } from '@/features/admin/roles/data/roles.facade';
import {
  CreateRolePayload,
  RoleSummary,
} from '@/features/admin/roles/models/roles.models';
import { RolesTable } from '@/features/admin/roles/components/roles-table/roles-table';
import { RoleCreateForm } from '@/features/admin/roles/components/role-create-form/role-create-form';

@Component({
  selector: 'app-roles-list-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RolesTable, RoleCreateForm, IjButton, IjIcon],
  template: `
    <div class="mx-auto max-w-[1100px]">
      <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="text-2xl font-extrabold tracking-tight text-ink-900">Roles y permisos</h1>
          <p class="mt-1.5 text-[13.5px] text-muted">
            Administra los roles de la plataforma y los permisos que otorgan.
          </p>
        </div>
        @if (!showCreate()) {
          <button
            ij-button
            type="button"
            variant="primary"
            shape="rounded"
            size="md"
            (click)="showCreate.set(true)"
          >
            <ij-icon name="plus" [size]="16" />
            Nuevo rol
          </button>
        }
      </div>

      @if (showCreate()) {
        <div class="mb-5">
          <app-role-create-form
            [submitting]="creating()"
            [error]="createError()"
            (create)="onCreate($event)"
            (cancel)="closeCreate()"
          />
        </div>
      }

      @switch (facade.rolesState()) {
        @case ('loading') {
          <div class="rounded-2xl bg-white p-10 text-center text-muted shadow-card">
            Cargando roles…
          </div>
        }
        @case ('error') {
          <div class="rounded-2xl bg-white p-10 text-center text-red-600 shadow-card">
            No se pudieron cargar los roles.
          </div>
        }
        @default {
          <app-roles-table [roles]="facade.roles()" (select)="onSelect($event)" />
        }
      }
    </div>
  `,
})
export class RolesListPage {
  protected readonly facade = inject(RolesFacade);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly showCreate = signal(false);
  protected readonly creating = signal(false);
  protected readonly createError = signal<string | null>(null);

  constructor() {
    this.facade.loadRoles();
  }

  protected onSelect(role: RoleSummary): void {
    void this.router.navigate(['/admin/roles', role.id]);
  }

  protected closeCreate(): void {
    this.showCreate.set(false);
    this.createError.set(null);
  }

  protected onCreate(payload: CreateRolePayload): void {
    this.creating.set(true);
    this.createError.set(null);
    this.facade
      .createRole(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (role) => {
          this.facade.roles.update((list) => [...list, role]);
          this.creating.set(false);
          this.closeCreate();
        },
        error: (error: unknown) => {
          this.creating.set(false);
          this.createError.set(this.messageOf(error));
        },
      });
  }

  private messageOf(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as ApiErrorResponse | null;
      if (body?.errorCode === 'ROLE_ALREADY_EXISTS') {
        return 'Ya existe un rol con ese código.';
      }
      return body?.message ?? 'No se pudo crear el rol.';
    }
    return 'No se pudo crear el rol.';
  }
}
