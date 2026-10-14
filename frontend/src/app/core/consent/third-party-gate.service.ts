import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { ConsentService } from '@/core/consent/consent.service';
import type { CookieCategory } from '@/core/consent/consent.config';

/**
 * Única puerta por la que sale una petición a un tercero.
 *
 * ## El problema que resuelve
 *
 * Antes de esto, `index.html` traía un `<link>` a **Google Fonts** que se
 * descargaba en cada página, incondicionalmente: la dirección IP de cada
 * visitante se leaba a Google antes de que nadie hubiera dicho nada. Con Google
 * Identity en `/auth/login` y las teselas de OpenStreetMap en `/contacto`, eran
 * tres terceros y tres fugas.
 *
 * ## Por qué no se deja la URL escrita en el template
 *
 * Porque entonces cada pantalla tendría que acordarse de la regla, y el día que
 * se añada un cuarto recurso nadie lo recordará. Aquí el componente pregunta si
 * puede cargar y, si no, dibuja un hueco con la misma forma; la decisión está
 * en un archivo, no repartida por los templates.
 *
 * ## Por qué un hueco y no nada
 *
 * Un mapa que no aparece es un mapa roto; una fuente que no aparece es la
 * página con la tipografía del sistema. En ambos casos el sitio **sigue siendo
 * utilizable**, que es lo que permite que el rechazo sea una opción de verdad y
 * no un castigo. El texto legal dice exactamente eso, y tiene que ser cierto.
 */
@Injectable({ providedIn: 'root' })
export class ThirdPartyGateService {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly consent = inject(ConsentService);

  /** URLs ya insertadas en el DOM, para no duplicarlas al navegar. */
  private readonly injected = new Set<string>();

  /** `true` si la categoría está autorizada. */
  allows(category: CookieCategory): boolean {
    return this.consent.allows(category);
  }

  /**
   * Inserta un `<script>` externo **una sola vez** y devuelve si procede.
   *
   * `async` por coherencia con `loadStyle()`: los componentes lo llaman igual
   * desde un `afterNextRender`, sin tener que distinguir casos.
   */
  async loadScript(src: string, category: CookieCategory): Promise<void> {
    if (!this.allows(category) || !this.isBrowser) return;
    if (this.injected.has(src)) return;

    await new Promise<void>((resolve, reject) => {
      const script = this.document.createElement('script');
      script.src = src;
      script.async = true;
      script.addEventListener('load', () => resolve());
      script.addEventListener('error', () => reject(new Error(src)));
      this.document.head.appendChild(script);
    });

    this.injected.add(src);
  }

  /**
   * Inserta un `<link>` de hoja de estilos una sola vez. Se usa para la fuente
   * autoalojada y para Google Identity.
   */
  async loadStyle(href: string, category: CookieCategory): Promise<boolean> {
    if (!this.allows(category) || !this.isBrowser) return false;
    if (this.injected.has(href)) return true;

    return new Promise<boolean>((resolve) => {
      const link = this.document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.addEventListener('load', () => resolve(true));
      // Un 404 en una fuente no debe romper la página: se resuelve igual y se
      // sigue con la tipografía del sistema.
      link.addEventListener('error', () => resolve(false));
      this.document.head.appendChild(link);
      this.injected.add(href);
    });
  }

}