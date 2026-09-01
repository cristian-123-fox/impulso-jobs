import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IjModal } from '@/shared/ui';

/**
 * Diálogo de confirmación del back-office (reemplaza al `confirm()` nativo,
 * siguiendo la regla de que todo el back-office edita en `ij-modal`). El padre
 * lo monta en un `@if`: existir es estar abierto.
 *
 * Uso:
 *   `<app-admin-confirm title="Eliminar rol" [message]="…" (confirm)="…" (cancel)="…" />`
 */
@Component({
  selector: 'app-admin-confirm',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjModal],
  template: `
    <ij-modal [title]="title()" size="sm" (close)="cancel.emit()">
      <p class="text-[13.5px] leading-relaxed text-body">{{ message() }}</p>
      <div class="mt-6 flex justify-end gap-3 border-t border-line pt-4">
        <button
          type="button"
          class="rounded-xl border border-line bg-white px-4 py-2.5 text-[13.5px] font-bold text-body transition-colors hover:bg-surface"
          (click)="cancel.emit()"
        >
          Cancelar
        </button>
        <button
          type="button"
          [class]="confirmClass()"
          (click)="confirm.emit()"
        >
          {{ confirmLabel() }}
        </button>
      </div>
    </ij-modal>
  `,
})
export class AdminConfirm {
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input('Eliminar');
  /** `danger` para bajas destructivas; `primary` para acciones reversibles. */
  readonly tone = input<'danger' | 'primary'>('danger');
  readonly confirm = output<void>();
  readonly cancel = output<void>();

  protected confirmClass(): string {
    const base =
      'rounded-xl px-4 py-2.5 text-[13.5px] font-bold text-white transition-colors active:translate-y-[1px]';
    return this.tone() === 'danger'
      ? `${base} bg-red-600 hover:bg-red-700`
      : `${base} bg-brand hover:bg-brand-600`;
  }
}
