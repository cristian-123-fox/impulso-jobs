import { A11yModule } from '@angular/cdk/a11y';
import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  output,
} from '@angular/core';
import { IjIcon } from '@/shared/ui/icon/icon';

type ModalSize = 'sm' | 'md' | 'lg';

const SIZES: Record<ModalSize, string> = {
  sm: 'max-w-[460px]',
  md: 'max-w-[680px]',
  lg: 'max-w-[900px]',
};

/**
 * Diálogo modal del UI Kit. El padre lo renderiza dentro de un `@if`, así que
 * no necesita estado de apertura: existir es estar abierto.
 *
 * La tecla Escape se escucha en la raíz del modal (no en `document`) para que,
 * con un `ij-select`/`ij-datepicker` desplegado —cuyo panel vive en el overlay
 * de CDK, fuera de este árbol—, Escape cierre sólo ese panel.
 *
 * Uso: `<ij-modal title="Nuevo usuario" (close)="…"><app-form /></ij-modal>`
 */
@Component({
  selector: 'ij-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [A11yModule, IjIcon],
  template: `
    <div
      class="fixed inset-0 z-50 flex overflow-y-auto overscroll-contain bg-ink-900/50 p-4 backdrop-blur-[1px] sm:p-6"
      (mousedown)="onBackdrop($event)"
      (keydown.escape)="close.emit()"
    >
      <div
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="title()"
        cdkTrapFocus
        [cdkTrapFocusAutoCapture]="true"
        class="m-auto w-full rounded-2xl bg-white shadow-float"
        [class]="panelClass()"
      >
        <header
          class="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6"
        >
          <div class="min-w-0">
            <h2 class="text-base font-bold text-ink-900">{{ title() }}</h2>
            @if (subtitle()) {
              <p class="mt-1 text-[13px] text-muted">{{ subtitle() }}</p>
            }
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            class="-mr-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] text-muted transition-colors hover:bg-surface hover:text-body"
            (click)="close.emit()"
          >
            <ij-icon name="close" [size]="20" />
          </button>
        </header>

        <div class="px-5 py-5 sm:px-6">
          <ng-content />
        </div>
      </div>
    </div>
  `,
})
export class IjModal {
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
  readonly size = input<ModalSize>('md');
  readonly close = output<void>();

  private readonly document = inject(DOCUMENT);

  constructor() {
    // Bloquea el scroll del fondo mientras el diálogo está montado.
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const body = this.document.body;
      body.classList.add('overflow-hidden');
      destroyRef.onDestroy(() => body.classList.remove('overflow-hidden'));
    });
  }

  /**
   * Cierra sólo si el gesto empieza en el fondo. Se escucha `mousedown` (y no
   * `click`) para que arrastrar una selección desde dentro del panel y soltar
   * fuera no cierre el diálogo perdiendo lo escrito.
   */
  protected onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close.emit();
  }

  protected panelClass(): string {
    return SIZES[this.size()];
  }
}
