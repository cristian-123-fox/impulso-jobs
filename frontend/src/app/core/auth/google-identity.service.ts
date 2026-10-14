import { isPlatformBrowser } from '@angular/common';
import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { ThirdPartyGateService } from '@/core/consent/third-party-gate.service';

/**
 * Carga de Google Identity Services (GIS) y pintado del botón oficial de
 * Google.
 *
 * ## La puerta que se añadió
 *
 * Antes este servicio insertaba `<script src="accounts.google.com">` sin mirar
 * nada. Eso significa que la IP de cualquiera que abriera `/auth/login` se leía
 * a Google antes de que hubiera respondido al banner de cookies, y Google
 * establece sus propias cookies en ese dominio.
 *
 * Ahora `load()` devuelve `null` si la categoría `functional` no está autorizada
 * y `renderButton()` no hace nada. Quien no haya aceptado no ve el botón de
 * Google: no es que se oculte, es que el script no llega a descargarse. Ocultarlo
 * visualmente habría dejado la petición hecha y el incumplimiento en pie.
 */
const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client';

/** Categoría del catálogo de cookies bajo la que cae este recurso. */
const GIS_CATEGORY = 'functional' as const;

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
  private readonly gate = inject(ThirdPartyGateService);
  private loading: Promise<void> | null = null;

  /**
   * GIS se inicializa una sola vez por carga de la aplicación.
   *
   * `initialize()` no admite Replacement: llamarlo otra vez avisa por consola
   * («is called multiple times…») y además invalida el `callback` anterior. El
   * formulario de login se recrea en cada visita a `/auth/login`, así que sin
   * este cerrojo el aviso salía en cuanto se volvía a la página.
   */
  private initialized = false;
  /**
   * Callback vigente. `initialize()` se queda con el primero, así que quien
   * repinta el botón deja aquí su manejador: si se quedara el closure de un
   * componente ya destruido, la credencial se emitiría sobre un `output` que ya
   * no escucha nadie y el botón dejaría de funcionar sin avisar.
   */
  private credentialHandler: ((credential: string) => void) | null = null;

  /**
   * Descarga `gsi/client` una sola vez por carga de la aplicación.
   *
   * Devuelve `null` —no un rechazo— cuando no hay consentimiento o no estamos
   * en el navegador: en ambos casos el estado normal es «no hay botón de Google»,
   * no «algo falló». El login por correo sigue igual de disponible, así que
   * rechazar las cookies funcionales no deja al usuario sin forma de entrar.
   */
  async load(): Promise<void | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    if (!this.gate.allows(GIS_CATEGORY)) return null;
    if (window.google?.accounts?.id) return null;

    this.loading ??= this.gate.loadScript(GIS_SCRIPT_URL, GIS_CATEGORY);
    await this.loading;
    return null;
  }

  /**
   * Pinta el botón de Google (estilo oficial, localizado) dentro de `host`.
   * El callback entrega el ID token: quien lo reciba se lo manda al backend.
   *
   * No lanza si el script no llegó a cargarse; simplemente no pinta nada.
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
    if (!id) return;

    // Siempre la más reciente: quien repinta el botón es quien debe recibir la
    // credencial.
    this.credentialHandler = options.onCredential;

    // Se limpia el contenedor para no duplicar el botón si se vuelve a pintar.
    host.replaceChildren();

    if (!this.initialized) {
      id.initialize({
        client_id: options.clientId,
        callback: (response) => this.credentialHandler?.(response.credential),
        lang: options.lang,
      });
      this.initialized = true;
    }

    id.renderButton(host, {
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      shape: 'pill',
      locale: options.lang,
    });
  }
}