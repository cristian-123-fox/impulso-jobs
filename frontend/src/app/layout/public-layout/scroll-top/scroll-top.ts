import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AppTranslateService } from '@/core/i18n/app-translate.service';
import { IjIcon } from '@/shared/ui';

/** A partir de cuántos píxeles de scroll aparece el botón. */
const THRESHOLD_PX = 400;

/**
 * Botón flotante "volver arriba". Aparece al bajar más allá de un umbral y hace
 * scroll suave hasta el inicio de la página.
 *
 * El umbral se detecta con un centinela invisible de `THRESHOLD_PX` de alto
 * anclado arriba del documento: mientras se vea, seguimos en la zona alta. Antes
 * era un `@HostListener('window:scroll')`, que con zone.js dispara detección de
 * cambios en toda la aplicación en cada evento de scroll. Mismo criterio que en
 * la barra de navegación.
 */
@Component({
  selector: 'app-scroll-top',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjIcon],
  template: `
    <span
      #sentinel
      class="pointer-events-none absolute left-0 top-0 w-px"
      [style.height.px]="threshold"
      aria-hidden="true"
    ></span>

    <button
      type="button"
      [attr.aria-label]="i18n.t('common.backToTop')"
      (click)="toTop()"
      [class.pointer-events-none]="!visible()"
      [class.opacity-0]="!visible()"
      [class.translate-y-3]="!visible()"
      class="fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-brand-700 text-white shadow-float transition-all duration-300 hover:bg-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2"
    >
      <ij-icon name="chevron-up" [size]="20" [strokeWidth]="2.5" />
    </button>
  `,
})
export class ScrollTop {
  /** Sólo hay un rótulo (el `aria-label`), así que no compensa `*transloco`. */
  protected readonly i18n = inject(AppTranslateService);
  protected readonly threshold = THRESHOLD_PX;
  protected readonly visible = signal(false);

  private readonly sentinel =
    viewChild.required<ElementRef<HTMLElement>>('sentinel');

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const observer = new IntersectionObserver(
        ([entry]) => this.visible.set(!entry.isIntersecting),
        { threshold: 0 },
      );
      observer.observe(this.sentinel().nativeElement);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  protected toTop(): void {
    // Respeta a quien pidió menos movimiento: salto directo en vez de scroll suave.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  }
}
