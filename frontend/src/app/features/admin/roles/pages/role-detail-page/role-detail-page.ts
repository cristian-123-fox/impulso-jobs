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
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiErrorResponse } from '@/core/models/api-response.models';
import { IjButton, IjIcon, IjInput } from '@/shared/ui';
import { AdminTableSkeleton } from '@/features/admin/shared/admin-table-skeleton/admin-table-skeleton';
import { RolesFacade } from '@/features/admin/roles/data/roles.facade';
import {
  ROLE_SCOPE_META,
  RoleSummary,
} from '@/features/admin/roles/models/roles.models';
import {
  PermissionToggle,
  PermissionTree,
} from '@/features/admin/roles/components/permission-tree/permission-tree';

/**
 * Detalle del rol: datos y **árbol de permisos**.
 *
 * Sigue siendo una ruta propia y no un `ij-modal` (la excepción que ya estaba
 * documentada): son ~50 permisos en nueve grupos, con búsqueda y un pie de
 * guardado — no cabe en un diálogo.
 *
 * El guardado es **en lote**: marcar un grupo mueve ocho casillas a la vez y
 * con el alta/baja individual eso eran ocho peticiones que podían fallar a
 * medias. Aquí se acumulan en memoria, se ve cuántos cambios hay sin guardar y
 * un `PUT` los aplica todos o ninguno.
 */
@Component({
  selector: 'app-role-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    AdminTableSkeleton,
    PermissionTree,
    IjButton,
    IjIcon,
    IjInput,
  ],
  template: `
    <div class="mx-auto max-w-[1100px] pb-24">
      <a
        routerLink="/admin/roles"
        class="mb-4 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-muted transition-colors hover:text-brand-strong"
      >
        <ij-icon name="chevron-left" [size]="16" />
        Volver a roles
      </a>

      @if (role(); as current) {
        <div class="mb-5 rounded-2xl bg-white p-5 shadow-card sm:p-6">
          <div class="mb-4 flex flex-wrap items-center gap-2">
            <span class="rounded-md bg-brand-50 px-2.5 py-1 text-sm font-bold text-brand-strong">
              {{ current.code }}
            </span>
            <span
              class="inline-flex items-center gap-1.5 rounded-md bg-surface px-2.5 py-1 text-[11.5px] font-semibold text-body"
            >
              <ij-icon [name]="scopeMeta().icon" [size]="14" />
              {{ scopeMeta().label }}
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
                <span class="text-[13px] font-semibold text-accent-green-strong">
                  Cambios guardados.
                </span>
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

        <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 class="text-lg font-bold text-ink-900">Permisos</h2>
            <p class="mt-1 text-[13.5px] text-muted">
              {{ scopeMeta().hint }} Marca lo que puede hacer este rol; los
              grupos activan todo su contenido de una vez.
            </p>
          </div>
          <span class="text-[13px] font-semibold text-muted">
            {{ selected().size }} permisos activos
          </span>
        </div>

        @if (permissionError(); as message) {
          <p
            role="alert"
            class="mb-3 rounded-xl bg-red-50 px-4 py-3 text-[13.5px] font-medium text-red-700"
          >
            {{ message }}
          </p>
        }

        <app-permission-tree
          [groups]="tree()"
          [selected]="selected()"
          [locked]="locked()"
          [dirty]="dirty()"
          [disabled]="savingPermissions()"
          (toggle)="onToggle($event)"
        />
      } @else {
        <app-admin-table-skeleton [rows]="4" label="Cargando rol…" />
      }
    </div>

    @if (dirty().size > 0) {
      <!--
        Barra fija: el árbol es largo y el botón de guardar no puede quedarse
        fuera de la vista después de marcar un grupo del final.
      -->
      <div
        class="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-4 py-3 shadow-float backdrop-blur"
      >
        <div class="mx-auto flex max-w-[1100px] flex-wrap items-center justify-end gap-3">
          <p class="mr-auto text-[13.5px] font-semibold text-ink-900">
            {{ dirty().size }}
            {{ dirty().size === 1 ? 'cambio sin guardar' : 'cambios sin guardar' }}
          </p>
          <button
            type="button"
            class="rounded-xl border border-line bg-white px-4 py-2.5 text-[13.5px] font-bold text-body transition-colors hover:bg-surface disabled:opacity-50"
            [disabled]="savingPermissions()"
            (click)="onDiscard()"
          >
            Descartar
          </button>
          <button
            ij-button
            type="button"
            variant="primary"
            shape="rounded"
            size="md"
            [disabled]="savingPermissions()"
            (click)="onSavePermissions()"
          >
            {{ savingPermissions() ? 'Guardando…' : 'Guardar cambios' }}
          </button>
        </div>
      </div>
    }
  `,
})
export class RoleDetailPage {
  protected readonly facade = inject(RolesFacade);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly role = signal<RoleSummary | null>(null);
  /** Lo guardado en el servidor; la referencia para saber qué cambió. */
  private readonly persisted = signal<ReadonlySet<string>>(new Set());
  /** Lo marcado ahora mismo en el árbol. */
  protected readonly selected = signal<ReadonlySet<string>>(new Set());
  protected readonly locked = signal<ReadonlySet<string>>(new Set());
  protected readonly savingPermissions = signal(false);
  protected readonly permissionError = signal<string | null>(null);
  protected readonly saveState = signal<'idle' | 'saving' | 'saved'>('idle');

  protected readonly scopeMeta = computed(
    () => ROLE_SCOPE_META[this.role()?.scope ?? 'PLATFORM'],
  );

  protected readonly tree = computed(() =>
    this.facade.permissionTree(this.role()?.scope ?? 'PLATFORM'),
  );

  /** Diferencia simétrica entre lo marcado y lo guardado. */
  protected readonly dirty = computed(() => {
    const persisted = this.persisted();
    const selected = this.selected();
    const changed = new Set<string>();
    for (const id of selected) if (!persisted.has(id)) changed.add(id);
    for (const id of persisted) if (!selected.has(id)) changed.add(id);
    return changed as ReadonlySet<string>;
  });

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
        this.applyPermissions(role.permissionIds ?? [], role.lockedPermissionIds ?? []);
        this.form.setValue({ name: role.name, description: role.description ?? '' });
        this.form.markAsPristine();
      });
  }

  /**
   * Lo fijo entra en lo marcado y en la referencia: así se ve activo y nunca
   * cuenta como cambio pendiente, aunque el backend no lo guarde en la tabla.
   */
  private applyPermissions(assigned: string[], locked: string[]): void {
    const all = new Set([...assigned, ...locked]);
    this.persisted.set(all);
    this.selected.set(new Set(all));
    this.locked.set(new Set(locked));
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
    this.permissionError.set(null);
    this.selected.update((current) => {
      const next = new Set(current);
      for (const id of event.ids) {
        if (event.checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  protected onDiscard(): void {
    this.permissionError.set(null);
    this.selected.set(new Set(this.persisted()));
  }

  protected onSavePermissions(): void {
    const current = this.role();
    if (!current || this.savingPermissions()) return;

    this.savingPermissions.set(true);
    this.permissionError.set(null);
    this.facade
      .replacePermissions(current.id, [...this.selected()])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        // El backend devuelve lo que quedó guardado: se adopta como referencia
        // en vez de suponer que se guardó exactamente lo enviado.
        next: (saved) => {
          this.applyPermissions(saved, [...this.locked()]);
          this.savingPermissions.set(false);
        },
        error: (error: unknown) => {
          this.savingPermissions.set(false);
          this.permissionError.set(
            this.messageOf(error, 'No se pudieron guardar los permisos.'),
          );
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
