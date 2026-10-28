import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  Injectable,
  PLATFORM_ID,
  REQUEST,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  CONSENT_COOKIE,
  CONSENT_COOKIE_MAX_AGE,
  DEFAULT_PREFERENCES,
  type CookieCategory,
  type CookiePreferences,
  normalizePreferences,
} from '@/core/consent/consent.config';

/**
 * Qué ha autorizado cada visitante, y si ya respondió.
 *
 * ## Por qué México obliga a esto aunque no haya ley de cookies
 *
 * No existe en México una ley tipo GDPR que exija un banner. Lo que obliga es
 * el **artículo 14, párrafo tercero, del Reglamento de la LFPDPPP**: quien use
 * mecanismos que permitan "recabar datos personales de manera automática y
 * simultánea al tiempo que el titular hace contacto con los mismos" debe
 * informar **en ese momento** de que los usa y de **la forma en que se podrán
 * deshabilitar**. Un banner es la forma más cómoda de cumplir las dos cosas.
 *
 * ## Por qué una cookie y no `localStorage`
 *
 * Porque el servidor tiene que poder leerlo. El HTML que sale de SSR ya sale
 * con el banner resuelto en su estado correcto (aceptado, rechazado o sin
 * respuesta) y sin parpadeo al hidratar, igual que se hace con `ij_lang`. Si
 * estuviera en `localStorage` el servidor no podría saberlo y el primer render
 * siempre mentiría.
 *
 * ## Por qué el estado por defecto es el restrictivo
 *
 * `DEFAULT_PREFERENCES` deja todo apagado menos lo indispensable. Es el artículo
 * 15, fracción IV de la LFPDPPP: hay que ofrecer «opciones y medios para
 * limitar el uso o divulgación». Un registro que empieza encendido es la carga
 * previa, que es justo lo que ese artículo prohíbe en la práctica.
 *
 * ## Lo que NO hace
 *
 * No envía nada a la API. El registro legal de la elección se hace aparte, en
 * `LegalConsentFacade.record()`, porque es una llamada de negocio con su
 * propio ciclo de vida; este servicio sólo resuelve el estado del cliente.
 */
@Injectable({ providedIn: 'root' })
export class ConsentService {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly request = inject(REQUEST, { optional: true });

  private readonly decided = signal<boolean>(false);
  private readonly preferences = signal<CookiePreferences>({
    ...DEFAULT_PREFERENCES,
  });

  /** `true` cuando la persona ya respondió una vez. */
  readonly hasDecision = this.decided.asReadonly();
  readonly current = this.preferences.asReadonly();

  /** El banner sólo aparece si no hay respuesta guardada. */
  readonly showBanner = computed(() => !this.decided());

  readonly granted = computed(
    () => (category: CookieCategory) => this.preferences()[category],
  );

  constructor() {
    const stored = this.readCookie();
    if (stored) {
      this.preferences.set(stored);
      this.decided.set(true);
    }
  }

  /** `true` si la categoría está autorizada. */
  allows(category: CookieCategory): boolean {
    return this.preferences()[category];
  }

  /** Responde "todo" o "nada" y persiste. */
  acceptAll(): void {
    this.commit({
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
    });
  }

  /**
   * Rechaza todo lo que se pueda rechazar. No es un modo "todo apagado":
   * `necessary` sigue activa porque sin idioma ni registro no hay web.
   */
  rejectAll(): void {
    this.commit({ ...DEFAULT_PREFERENCES });
  }

  /** Guarda una elección granular y persiste. */
  save(preferences: CookiePreferences): void {
    this.commit(preferences);
  }

  /**
   * Permite recuperar el banner sin borrar la preferencia guardada. Se usa en
   * el enlace "cambiar mis preferencias" de la Política de cookies, que el
   * artículo 14 párrafo tercero exige ofrecer: sin él no hay forma de deshacer
   * una decisión.
   */
  reopen(): void {
    this.decided.set(false);
  }

  private commit(preferences: CookiePreferences): void {
    const normalized = normalizePreferences(preferences);
    this.preferences.set(normalized);
    this.decided.set(true);
    this.persist(normalized);
  }

  private persist(preferences: CookiePreferences): void {
    if (!this.isBrowser) return;
    // `Secure` sólo en HTTPS: en local por HTTP el navegador descartaría la
    // cookie y el banner reaparecería en cada recarga.
    const secure =
      this.document.location?.protocol === 'https:' ? '; Secure' : '';
    this.document.cookie =
      `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(preferences))}; ` +
      `path=/; max-age=${CONSENT_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
  }

  private readCookie(): CookiePreferences | null {
    const raw = this.isBrowser
      ? this.document.cookie
      : this.request?.headers.get('cookie');
    if (!raw) return null;

    for (const part of raw.split(';')) {
      const [name, ...rest] = part.trim().split('=');
      if (name !== CONSENT_COOKIE) continue;
      try {
        return normalizePreferences(
          JSON.parse(decodeURIComponent(rest.join('='))),
        );
      } catch {
        // Cookie corrupta: se ignora y se vuelve a preguntar. Preferible a
        // bloquear la web con un valor que no se sabe qué significa.
        return null;
      }
    }
    return null;
  }
}