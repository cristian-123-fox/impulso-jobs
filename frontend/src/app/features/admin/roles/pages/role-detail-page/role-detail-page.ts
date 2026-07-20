import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IjButton, IjIcon, IjInput } from '@/shared/ui';
import { RolesFacade } from '@/features/admin/roles/data/roles.facade';
import { RoleSummary } from '@/features/admin/roles/models/roles.models';
import {
  PermissionMatrix,
  PermissionToggle,
} from '@/features/admin/roles/components/permission-matrix/permission-matrix';

@Component({
  selector: 'app-role-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    PermissionMatrix,
    IjButton,
    IjIcon,
    IjInput,
  ],
  template: `
    <div class="mx-auto max-w-[1100px]">
      <a
        routerLink="/admin/roles"
        class="mb-4 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-muted transition-colors hover:text-brand"
      >
        <ij-icon name="chevron-left" [size]="16" />
        Volver a roles
      </a>

      @if (role(); as current) {
        <div class="mb-5 rounded-2xl bg-white p-5 shadow-card sm:p-6">
          <div class="mb-4 flex items-center gap-3">
            <span class="rounded-md bg-brand-50 px-2.5 py-1 text-sm font-bold text-brand">
              {{ current.code }}
            </span>
            @if (current.isSystem) {
              <span class="rounded-md bg-surface px-2.5 py-1 text-[11.5px] font-semibold text-muted">
                Rol de sistema
              </span>
            }
          </div>
          <form [formGroup]="form" class="grid gap-4 sm:grid-cols-2" (ngSubmit)="onSave()">
            <ij-input label="Nombre" formControlName="name" />
            <ij-input label="Descripción" formControlName="description" />
            <div class="flex items-center justify-between sm:col-span-2">
              @if (saveState() === 'saved') {
                <span class="text-[13px] font-semibold text-accent-green">Cambios guardados.</span>
              } @else {
                <span></span>
              }
              <button
                ij-button
                type="submit"
                variant="primary"
                shape="rounded"
                size="sm"
                [disabled]="saveState() === 'saving' || form.pristine || form.invalid"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>

        <h2 class="mb-1.5 text-lg font-bold text-ink-900">Permisos</h2>
        <p class="mb-4 text-[13.5px] text-muted">
          Marca los permisos <code class="text-brand">component.action</code> que otorga este rol.
        </p>
        <app-permission-matrix
          [groups]="facade.permissionGroups()"
          [assigned]="assigned()"
          [pendingId]="pendingId()"
          (toggle)="onToggle($event)"
        />
      } @else {
        <div class="rounded-2xl bg-white p-10 text-center text-muted shadow-card">Cargando rol…</div>
      }
    </div>
  `,
})
export class RoleDetailPage {
  protected readonly facade = inject(RolesFacade);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly role = signal<RoleSummary | null>(null);
  protected readonly assigned = signal<ReadonlySet<string>>(new Set());
  protected readonly pendingId = signal<string | null>(null);
  protected readonly saveState = signal<'idle' | 'saving' | 'saved'>('idle');

  protected readonly form = this.fb.group({
    name: this.fb.control('', [Validators.required]),
    description: this.fb.control(''),
  });

  constructor() {
    this.facade.loadPermissions();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.load(id);
  }

  private load(id: string): void {
    this.facade
      .getRole(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((role) => {
        this.role.set(role);
        this.assigned.set(new Set(role.permissionIds ?? []));
        this.form.setValue({ name: role.name, description: role.description ?? '' });
        this.form.markAsPristine();
      });
  }

  protected onSave(): void {
    const current = this.role();
    if (!current || this.form.invalid) return;
    this.saveState.set('saving');
    const value = this.form.getRawValue();
    this.facade
      .updateRole(current.id, {
        name: value.name.trim(),
        description: value.description.trim() || undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.role.set({ ...current, name: updated.name, description: updated.description });
          this.form.markAsPristine();
          this.saveState.set('saved');
        },
        error: () => this.saveState.set('idle'),
      });
  }

  protected onToggle(event: PermissionToggle): void {
    const current = this.role();
    if (!current) return;
    const { permission, assigned } = event;
    this.pendingId.set(permission.id);
    const request = assigned
      ? this.facade.assignPermission(current.id, permission.id)
      : this.facade.removePermission(current.id, permission.id);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.assigned.update((set) => {
          const next = new Set(set);
          if (assigned) next.add(permission.id);
          else next.delete(permission.id);
          return next;
        });
        this.pendingId.set(null);
      },
      // En error no cambiamos `assigned()`: el checkbox se re-sincroniza al estado real.
      error: () => this.pendingId.set(null),
    });
  }
}
