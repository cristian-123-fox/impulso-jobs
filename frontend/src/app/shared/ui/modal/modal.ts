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
import { AppTranslateService } from '@/core/i18n/app-translate.service';
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
            [attr.aria-label]="i18n.t('common.close')"
            class="-mr-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] text-muted transition-colors hover:bg-surface hover:text-body"
            (click)="close.emit()"
          >
            <ij-icon name="close" [size]="20" />
          </button>
        </header>

        <div [class]="bodyClass()">
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
  /**
   * Acota el alto del panel al de la ventana y desplaza sólo su cuerpo, en vez
   * de desplazar la página entera. Sirve para formularios largos: la cabecera
   * queda a la vista y el pie del formulario puede fijarse con `sticky bottom-0`
   * dentro del contenido, que es donde vive el contenedor de desplazamiento.
   */
  readonly scrollable = input(false);
  readonly close = output<void>();

  private readonly document = inject(DOCUMENT);
  /** Sólo el botón de cerrar lleva texto propio; el resto es contenido ajeno. */
  protected readonly i18n = inject(AppTranslateService);

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
    const size = SIZES[this.size()];
    return this.scrollable()
      ? `${size} flex max-h-[calc(100vh-2rem)] flex-col sm:max-h-[calc(100vh-3rem)]`
      : size;
  }

  protected bodyClass(): string {
    const base = 'px-5 py-5 sm:px-6';
    return this.scrollable()
      ? `${base} min-h-0 flex-1 overflow-y-auto overscroll-contain`
      : base;
  }
}
