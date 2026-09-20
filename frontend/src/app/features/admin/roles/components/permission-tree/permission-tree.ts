import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { IconName, IjIcon } from '@/shared/ui';
import { PermissionTreeGroup } from '@/features/admin/roles/data/roles.facade';
import { Permission } from '@/features/admin/roles/models/roles.models';

/** Lo que pide el árbol al marcar o desmarcar: uno o varios permisos a la vez. */
export interface PermissionToggle {
  ids: string[];
  checked: boolean;
}

interface TreeNode {
  key: string;
  label: string;
  description: string;
  icon: IconName;
  items: Permission[];
  /** Ids que el usuario puede mover (los fijos no cuentan). */
  editableIds: string[];
  selectedCount: number;
  state: 'checked' | 'mixed' | 'unchecked';
  /** El grupo entero es fijo: se ve marcado y no se puede tocar. */
  allLocked: boolean;
}

const KNOWN_ICONS = new Set<string>([
  'users',
  'shield',
  'building',
  'briefcase',
  'clipboard',
  'search',
  'credit-card',
  'settings',
  'user',
  'tag',
]);

/**
 * Árbol de permisos por grupo (presentacional). Sustituye a la matriz plana de
 * casillas con el código `component.action` como etiqueta, que obligaba a
 * traducir mentalmente `applications.status.update` para saber qué se estaba
 * concediendo.
 *
 * Tres decisiones que conviene no deshacer:
 *
 * - **El padre manda sobre los hijos**, con estado intermedio cuando sólo
 *   algunos están marcados. Es lo que convierte 50 casillas sueltas en 9
 *   decisiones legibles.
 * - **Los permisos fijos se pintan marcados y bloqueados**, no se ocultan: un
 *   rol que puede leer catálogos debe poder verse que puede, aunque no sea una
 *   decisión de quien administra.
 * - **No guarda nada.** Emite intenciones; el guardado en lote vive en la
 *   página, que es la que sabe qué cambió respecto a lo guardado.
 */
@Component({
  selector: 'app-permission-tree',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjIcon],
  host: { class: 'block' },
  template: `
    <div class="mb-3 flex flex-wrap items-center gap-2">
      <div class="relative min-w-[220px] flex-1">
        <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
          <ij-icon name="search" [size]="16" />
        </span>
        <input
          type="search"
          class="h-[42px] w-full rounded-xl border border-line bg-white pl-9 pr-3 text-[13.5px] text-ink-900 outline-none transition-colors placeholder:text-muted focus:border-brand"
          placeholder="Buscar un permiso…"
          [value]="query()"
          (input)="onQuery($event)"
          aria-label="Buscar un permiso"
        />
      </div>
      <button type="button" [class]="toolClass" (click)="expandAll()">
        Expandir todo
      </button>
      <button type="button" [class]="toolClass" (click)="collapseAll()">
        Contraer todo
      </button>
    </div>

    @if (nodes().length === 0) {
      <p class="rounded-xl border border-dashed border-line px-4 py-8 text-center text-[13.5px] text-muted">
        Ningún permiso coincide con «{{ query() }}».
      </p>
    }

    <div class="flex flex-col gap-2">
      @for (node of nodes(); track node.key) {
        <section class="overflow-hidden rounded-xl border border-line">
          <div
            class="flex items-center gap-3 px-3 py-2.5 transition-colors"
            [class]="isOpen(node.key) ? 'bg-surface/60' : 'bg-white hover:bg-surface/40'"
          >
            <button
              type="button"
              class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-white hover:text-ink-900"
              [attr.aria-expanded]="isOpen(node.key)"
              [attr.aria-label]="
                (isOpen(node.key) ? 'Contraer ' : 'Desplegar ') + node.label
              "
              (click)="toggleOpen(node.key)"
            >
              <ij-icon
                [name]="isOpen(node.key) ? 'chevron-down' : 'chevron-right'"
                [size]="16"
                [strokeWidth]="2.2"
              />
            </button>

            <label class="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                class="peer sr-only"
                [checked]="node.state === 'checked'"
                [indeterminate]="node.state === 'mixed'"
                [disabled]="disabled() || node.allLocked"
                (change)="onGroup(node)"
              />
              <span [class]="boxClass(node.state, node.allLocked)">
                @switch (node.state) {
                  @case ('checked') {
                    <ij-icon name="check" [size]="12" [strokeWidth]="3.2" />
                  }
                  @case ('mixed') {
                    <span class="h-[2px] w-2.5 rounded-full bg-white"></span>
                  }
                }
              </span>
              <span class="min-w-0 flex-1">
                <span class="flex items-center gap-2">
                  <ij-icon [name]="node.icon" [size]="16" class="text-muted" />
                  <span class="truncate text-[13.5px] font-bold text-ink-900">
                    {{ node.label }}
                  </span>
                </span>
                <span class="mt-0.5 block truncate text-[12px] text-muted">
                  {{ node.description }}
                </span>
              </span>
              <span [class]="counterClass(node)">
                {{ node.selectedCount }} de {{ node.items.length }}
              </span>
            </label>
          </div>

          @if (isOpen(node.key)) {
            <ul class="divide-y divide-line/60 border-t border-line">
              @for (permission of node.items; track permission.id) {
                <li>
                  <label
                    class="flex cursor-pointer items-start gap-3 px-3 py-2.5 pl-[52px] transition-colors hover:bg-surface/40"
                    [class.cursor-not-allowed]="isLocked(permission.id)"
                  >
                    <input
                      type="checkbox"
                      class="peer sr-only"
                      [checked]="isSelected(permission.id)"
                      [disabled]="disabled() || isLocked(permission.id)"
                      (change)="toggle.emit({ ids: [permission.id], checked: isChecked($event) })"
                    />
                    <span
                      [class]="
                        boxClass(
                          isSelected(permission.id) ? 'checked' : 'unchecked',
                          isLocked(permission.id)
                        ) + ' mt-0.5'
                      "
                    >
                      @if (isSelected(permission.id)) {
                        <ij-icon name="check" [size]="12" [strokeWidth]="3.2" />
                      }
                    </span>
                    <span class="min-w-0 flex-1">
                      <span class="flex flex-wrap items-center gap-2">
                        <span class="text-[13.5px] font-semibold text-ink-900">
                          {{ permission.label }}
                        </span>
                        @if (isLocked(permission.id)) {
                          <span
                            class="rounded-md bg-surface px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-muted"
                            title="Siempre activo: lo concede el tipo de rol."
                          >
                            Siempre activo
                          </span>
                        }
                        @if (dirty().has(permission.id)) {
                          <span
                            class="rounded-md bg-brand-50 px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-brand-strong"
                          >
                            Sin guardar
                          </span>
                        }
                      </span>
                      @if (permission.description) {
                        <span class="mt-0.5 block text-[12.5px] text-muted">
                          {{ permission.description }}
                        </span>
                      }
                    </span>
                    <code class="hidden shrink-0 text-[11.5px] text-muted sm:block">
                      {{ permission.code }}
                    </code>
                  </label>
                </li>
              }
            </ul>
          }
        </section>
      }
    </div>
  `,
})
export class PermissionTree {
  readonly groups = input.required<readonly PermissionTreeGroup[]>();
  /** Ids marcados ahora mismo, incluidos los fijos. */
  readonly selected = input.required<ReadonlySet<string>>();
  /** Ids que el rol tiene siempre y no se pueden desmarcar. */
  readonly locked = input<ReadonlySet<string>>(new Set<string>());
  /** Ids con un cambio pendiente de guardar. */
  readonly dirty = input<ReadonlySet<string>>(new Set<string>());
  readonly disabled = input(false);
  readonly toggle = output<PermissionToggle>();

  protected readonly query = signal('');
  /** Grupos desplegados. Arranca con todos cerrados: la vista cabe de un vistazo. */
  private readonly open = signal<ReadonlySet<string>>(new Set<string>());

  protected readonly toolClass =
    'h-[42px] shrink-0 rounded-xl border border-line bg-white px-3.5 text-[13px] font-bold ' +
    'text-body transition-colors hover:bg-surface active:translate-y-[1px]';

  /**
   * El recuadro de la casilla. El color lo decide Angular y no `peer-checked:`
   * porque la marca vive **dentro** del recuadro: el combinador de hermanos de
   * Tailwind no alcanza a un descendiente. `peer-focus-visible` sí se queda,
   * que ahí el destino es el propio hermano del `input`.
   */
  protected boxClass(
    state: 'checked' | 'mixed' | 'unchecked',
    locked = false,
  ): string {
    const base =
      'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] border-2 ' +
      'text-white transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40';
    if (state === 'unchecked') return `${base} border-line bg-white`;
    // `brand-700` y no el naranja de marca: relleno bajo una marca blanca, que
    // con el tono base se queda en 2.90:1 y no cumple WCAG AA.
    return locked
      ? `${base} border-muted bg-muted`
      : `${base} border-brand-700 bg-brand-700`;
  }

  protected readonly nodes = computed<TreeNode[]>(() => {
    const term = this.query().trim().toLowerCase();
    const selected = this.selected();
    const locked = this.locked();

    return this.groups()
      .map(({ group, items }) => {
        const matched = term
          ? items.filter(
              (permission) =>
                group.label.toLowerCase().includes(term) ||
                permission.label.toLowerCase().includes(term) ||
                permission.code.toLowerCase().includes(term) ||
                (permission.description ?? '').toLowerCase().includes(term),
            )
          : items;
        const editableIds = matched
          .filter((permission) => !locked.has(permission.id))
          .map((permission) => permission.id);
        const selectedCount = matched.filter((permission) =>
          selected.has(permission.id),
        ).length;

        return {
          key: group.key,
          label: group.label,
          description: group.description,
          icon: KNOWN_ICONS.has(group.icon)
            ? (group.icon as IconName)
            : ('tag' as IconName),
          items: matched,
          editableIds,
          selectedCount,
          state:
            selectedCount === 0
              ? ('unchecked' as const)
              : selectedCount === matched.length
                ? ('checked' as const)
                : ('mixed' as const),
          allLocked: editableIds.length === 0,
        };
      })
      .filter((node) => node.items.length > 0);
  });

  /** Buscar despliega: un resultado escondido dentro de un grupo cerrado no sirve. */
  protected isOpen(key: string): boolean {
    return this.query().trim().length > 0 || this.open().has(key);
  }

  protected isSelected(id: string): boolean {
    return this.selected().has(id);
  }

  protected isLocked(id: string): boolean {
    return this.locked().has(id);
  }

  protected counterClass(node: TreeNode): string {
    const base =
      'shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-extrabold tabular-nums';
    return node.selectedCount === 0
      ? `${base} bg-surface text-muted`
      : `${base} bg-brand-50 text-brand-strong`;
  }

  protected onQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected isChecked(event: Event): boolean {
    return (event.target as HTMLInputElement).checked;
  }

  protected toggleOpen(key: string): void {
    this.open.update((keys) => {
      const next = new Set(keys);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  protected expandAll(): void {
    this.open.set(new Set(this.nodes().map((node) => node.key)));
  }

  protected collapseAll(): void {
    this.open.set(new Set());
  }

  /** Marcar un grupo mueve sólo lo editable y lo visible con el filtro puesto. */
  protected onGroup(node: TreeNode): void {
    if (node.editableIds.length === 0) return;
    const allSelected = node.editableIds.every((id) => this.selected().has(id));
    this.toggle.emit({ ids: node.editableIds, checked: !allSelected });
  }
}
