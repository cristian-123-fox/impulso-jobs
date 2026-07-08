import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  signal,
} from '@angular/core';
import { IjIcon } from '@/shared/ui';

/**
 * Botón flotante "volver arriba". Aparece al bajar más allá de un umbral y hace
 * scroll suave hasta el inicio de la página.
 */
@Component({
  selector: 'app-scroll-top',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjIcon],
  template: `
    <button
      type="button"
      aria-label="Volver arriba"
      (click)="toTop()"
      [class.pointer-events-none]="!visible()"
      [class.opacity-0]="!visible()"
      [class.translate-y-3]="!visible()"
      class="fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-brand text-white shadow-float transition-all duration-300 hover:bg-brand-600"
    >
      <ij-icon name="chevron-up" [size]="20" [strokeWidth]="2.5" />
    </button>
  `,
})
export class ScrollTop {
  protected readonly visible = signal(false);

  /** El scroll no ocurre en SSR; leer window aquí es seguro. */
  @HostListener('window:scroll')
  protected onScroll(): void {
    this.visible.set(window.scrollY > 400);
  }

  protected toTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
