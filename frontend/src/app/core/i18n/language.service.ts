import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, REQUEST, computed, inject, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_COOKIE,
  LANGUAGE_COOKIE_MAX_AGE,
  LANGUAGE_LOCALES,
  LANGUAGE_QUERY_PARAM,
  Language,
  isSupportedLanguage,
} from '@/core/i18n/i18n.config';

/**
 * Idioma activo del portal (T26).
 *
 * La fuente de verdad es una **cookie**, leída en los dos lados: en servidor de
 * la cabecera `Cookie` de la petición, en navegador de `document.cookie`. Así
 * el HTML que sirve SSR ya sale en el idioma elegido y el primer render del
 * cliente coincide con él — sin parpadeo al hidratar.
 *
 * Por encima de la cookie manda el parámetro `?lang=`, que es lo que hace
 * posible un `hreflang` honesto: sin URL propia por idioma no hay nada que
 * anunciarle a un buscador. Al entrar por una de esas URLs el idioma se guarda
 * en la cookie, de modo que el resto de la navegación ya no necesita el
 * parámetro.
 *
 * Cambiar de idioma **no recarga**: se reescribe la cookie y se le dice a
 * Transloco que cambie de diccionario; las vistas se repintan solas.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly transloco = inject(TranslocoService);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  /** Sólo existe al renderizar en servidor. */
  private readonly request = inject(REQUEST, { optional: true });

  private readonly language = signal<Language>(DEFAULT_LANGUAGE);
  readonly current = this.language.asReadonly();
  readonly locale = computed(() => LANGUAGE_LOCALES[this.language()]);

  /**
   * Idioma de la petición actual, antes de que Transloco arranque. Lo usa el
   * inicializador de la app para cargar el diccionario correcto de entrada.
   */
  resolveInitial(): Language {
    const fromUrl = this.readQueryParam();
    if (isSupportedLanguage(fromUrl)) return fromUrl;

    const fromCookie = this.readCookie();
    return isSupportedLanguage(fromCookie) ? fromCookie : DEFAULT_LANGUAGE;
  }

  /** Fija el idioma sin persistirlo (arranque). */
  apply(lang: Language): void {
    this.language.set(lang);
    this.transloco.setActiveLang(lang);
    // `<html lang>` importa para lectores de pantalla y para el SEO.
    this.document.documentElement.lang = lang;
  }

  /**
   * Arranque: fija el idioma y, si vino por `?lang=`, lo recuerda en la cookie
   * para que la siguiente navegación no dependa del parámetro.
   */
  initialize(lang: Language): void {
    this.apply(lang);
    if (this.readQueryParam()) this.persist(lang);
  }

  /** Cambia el idioma por elección del usuario y lo recuerda. */
  use(lang: Language): void {
    if (lang === this.language()) return;
    this.apply(lang);
    this.persist(lang);
    this.dropQueryParam();
  }

  private persist(lang: Language): void {
    if (!this.isBrowser) return;
    // `SameSite=Lax` basta: la cookie sólo se lee en navegaciones propias.
    this.document.cookie =
      `${LANGUAGE_COOKIE}=${lang}; path=/; max-age=${LANGUAGE_COOKIE_MAX_AGE}; SameSite=Lax`;
  }

  private readCookie(): string | null {
    const raw = this.isBrowser
      ? this.document.cookie
      : this.request?.headers.get('cookie');
    if (!raw) return null;

    for (const part of raw.split(';')) {
      const [name, ...rest] = part.trim().split('=');
      if (name === LANGUAGE_COOKIE) return decodeURIComponent(rest.join('='));
    }
    return null;
  }

  private readQueryParam(): string | null {
    const url = this.isBrowser
      ? this.document.defaultView?.location.href
      : this.request?.url;
    if (!url) return null;

    try {
      return new URL(url).searchParams.get(LANGUAGE_QUERY_PARAM);
    } catch {
      return null;
    }
  }

  /**
   * Quita `?lang=` de la barra de direcciones al cambiar de idioma a mano: si
   * se quedara, una recarga volvería al idioma de la URL y contradiría la
   * elección recién hecha. Se reescribe el historial, no se navega, para no
   * disparar el router ni perder la posición de scroll.
   */
  private dropQueryParam(): void {
    if (!this.isBrowser) return;
    const view = this.document.defaultView;
    if (!view?.history || !this.readQueryParam()) return;

    const url = new URL(view.location.href);
    url.searchParams.delete(LANGUAGE_QUERY_PARAM);
    view.history.replaceState(view.history.state, '', url.toString());
  }
}
