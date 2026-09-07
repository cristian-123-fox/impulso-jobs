import {
  Directive,
  ElementRef,
  PLATFORM_ID,
  DestroyRef,
  afterNextRender,
  inject,
  input,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/** Un solo observer para toda la página: N elementos, un callback. */
let sharedObserver: IntersectionObserver | null = null;
const pending = new WeakMap<Element, () => void>();

function observerFor(): IntersectionObserver {
  sharedObserver ??= new IntersectionObserver(
    (entries, observer) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        pending.get(entry.target)?.();
        observer.unobserve(entry.target);
        pending.delete(entry.target);
      }
    },
    // 12% visible basta: la sección entra ya animándose, no de golpe al final.
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
  );
  return sharedObserver;
}

/**
 * Entrada al hacer scroll. El elemento sube a su sitio la primera vez que entra
 * en el viewport; después se deja de observar.
 *
 * Usa `IntersectionObserver`, no un listener de `scroll`: el navegador decide
 * cuándo evaluar y no hay trabajo por frame. Anima sólo `opacity`/`transform`.
 *
 * **Sólo esconde lo que aún no se ve.** La decisión se toma en
 * `afterNextRender`, ya con layout: si el elemento cae dentro del viewport
 * inicial se muestra sin más. Esconder de entrada todo lo marcado provocaba dos
 * defectos reales: al hidratar, lo que el servidor ya había pintado arriba
 * parpadeaba a invisible, y si el observer nunca llegaba a dispararse el
 * contenido se quedaba en blanco de forma permanente.
 *
 * Se degrada a "visible" en SSR/prerender, sin `IntersectionObserver` y con
 * `prefers-reduced-motion: reduce`. Nunca esconde algo que no pueda mostrar.
 *
 * Uso: `<section ijReveal>` · `<div ijReveal [revealDelay]="80">`
 */
@Directive({
  selector: '[ijReveal]',
  host: {
    '[class.animate-reveal-up]': 'animating()',
    '[class.opacity-0]': 'hidden()',
    '[style.animation-delay.ms]': 'animating() ? revealDelay() : null',
  },
})
export class IjReveal {
  /** Retardo de entrada en ms, para escalonar hermanos dentro de una rejilla. */
  readonly revealDelay = input(0);

  /** `true` mientras el elemento espera fuera del viewport. */
  protected readonly hidden = signal(false);
  /** `true` sólo durante la animación de entrada. */
  protected readonly animating = signal(false);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
    const destroyRef = inject(DestroyRef);

    if (!isBrowser || typeof IntersectionObserver === 'undefined') return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduced.matches) return;

    afterNextRender(() => {
      const element = this.host.nativeElement;

      // Ya visible al cargar: se deja tal cual, sin ocultar ni animar.
      if (element.getBoundingClientRect().top < window.innerHeight) return;

      this.hidden.set(true);
      pending.set(element, () => {
        this.hidden.set(false);
        this.animating.set(true);
      });
      observerFor().observe(element);

      // Si se activa "reducir movimiento" con la página abierta, se muestra lo
      // que quedara pendiente en vez de dejarlo invisible para siempre.
      const onPreferenceChange = () => {
        if (!reduced.matches) return;
        this.hidden.set(false);
        sharedObserver?.unobserve(element);
        pending.delete(element);
      };
      reduced.addEventListener('change', onPreferenceChange);

      destroyRef.onDestroy(() => {
        reduced.removeEventListener('change', onPreferenceChange);
        sharedObserver?.unobserve(element);
        pending.delete(element);
      });
    });
  }
}
