import { isPlatformBrowser } from '@angular/common';
import { Injectable, inject, PLATFORM_ID } from '@angular/core';

/**
 * Carga de Google Identity Services (GIS) y pintado del botón oficial de
 * Google.
 *
 * GIS es un script de terceros que sólo existe en el navegador: por eso el
 * servicio se protege con `PLATFORM_ID` y el caller lo usa dentro de
 * `afterNextRender` — la ruta `/auth/**` está prerenderizada y tocar `window`
 * en el servidor rompería el SSR.
 */
const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client';

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleIdConfig {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  lang?: string;
}

interface GoogleRenderButtonOptions {
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'small' | 'medium' | 'large';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'purchase_with';
  shape?: 'rectangular' | 'pill';
  locale?: string;
  width?: number;
}

interface GoogleAccountsId {
  initialize(config: GoogleIdConfig): void;
  renderButton(element: HTMLElement, options: GoogleRenderButtonOptions): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

@Injectable({ providedIn: 'root' })
export class GoogleIdentityService {
  private readonly platformId = inject(PLATFORM_ID);
  private loading: Promise<void> | null = null;

  /** Descarga `gsi/client` una sola vez por carga de la aplicación. */
  load(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return Promise.reject(
        new Error('Google Identity Services sólo existe en el navegador.'),
      );
    }
    if (window.google?.accounts?.id) return Promise.resolve();

    this.loading ??= new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = GIS_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => {
        // Se limpia para que un reintento vuelva a intentar descargarla.
        this.loading = null;
        script.remove();
        reject(new Error('No se pudo cargar Google Identity Services.'));
      };
      document.head.appendChild(script);
    });
    return this.loading;
  }

  /**
   * Pinta el botón de Google (estilo oficial, localizado) dentro de `host`.
   * El callback entrega el ID token: quien lo reciba se lo manda al backend.
   */
  renderButton(
    host: HTMLElement,
    options: {
      clientId: string;
      lang: string;
      onCredential: (credential: string) => void;
    },
  ): void {
    const id = window.google?.accounts?.id;
    if (!id) {
      throw new Error('Google Identity Services no está cargado.');
    }
    // Se limpia el contenedor para no duplicar el botón si se vuelve a pintar.
    host.replaceChildren();
    id.initialize({
      client_id: options.clientId,
      callback: (response) => options.onCredential(response.credential),
      lang: options.lang,
    });
    id.renderButton(host, {
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      shape: 'pill',
      locale: options.lang,
    });
  }
}
