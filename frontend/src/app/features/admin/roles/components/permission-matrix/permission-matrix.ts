import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Permission } from '@/features/admin/roles/models/roles.models';

export interface PermissionGroup {
  component: string;
  items: Permission[];
}

export interface PermissionToggle {
  permission: Permission;
  assigned: boolean;
}

/** Matriz de permisos agrupada por componente (presentacional). */
@Component({
  selector: 'app-permission-matrix',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-4">
      @for (group of groups(); track group.component) {
        <div class="rounded-2xl border border-line bg-white p-5 shadow-card">
          <h4 class="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
            {{ group.component }}
          </h4>
          <div class="grid gap-2 sm:grid-cols-2">
            @for (permission of group.items; track permission.id) {
              <label
                class="flex cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-surface"
                [class.opacity-60]="pendingId() === permission.id"
              >
                <input
                  type="checkbox"
                  class="mt-0.5 h-[17px] w-[17px] cursor-pointer rounded accent-brand"
                  [checked]="assigned().has(permission.id)"
                  [disabled]="pendingId() !== null"
                  (change)="toggle.emit({ permission, assigned: isChecked($event) })"
                />
                <span class="min-w-0 flex-1">
                  <span class="block text-[13.5px] font-semibold text-ink-900">{{ permission.code }}</span>
                  @if (permission.description) {
                    <span class="block text-xs text-muted">{{ permission.description }}</span>
                  }
                </span>
              </label>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class PermissionMatrix {
  readonly groups = input.required<readonly PermissionGroup[]>();
  readonly assigned = input.required<ReadonlySet<string>>();
  readonly pendingId = input<string | null>(null);
  readonly toggle = output<PermissionToggle>();

  protected isChecked(event: Event): boolean {
    return (event.target as HTMLInputElement).checked;
  }
}
