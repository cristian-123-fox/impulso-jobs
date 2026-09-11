import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Meta, Title } from '@angular/platform-browser';
import { TranslocoService } from '@jsverse/transloco';
import { environment } from '@env';
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_HREFLANG,
  LANGUAGE_LOCALES,
  LANGUAGE_QUERY_PARAM,
  Language,
  SUPPORTED_LANGUAGES,
} from '@/core/i18n/i18n.config';
import { LanguageService } from '@/core/i18n/language.service';

export interface SeoPage {
  title: string;
  description: string;
  /** Ruta absoluta dentro del sitio (`/vacantes/...`); arma el canonical y og:url. */
  canonicalPath?: string;
  /** URL absoluta de imagen para OG; por defecto el logo. */
  image?: string;
}

/** Igual que `SeoPage`, pero con claves de traducción (T26). */
export interface LocalizedSeoPage {
  titleKey: string;
  descriptionKey: string;
  canonicalPath?: string;
  image?: string;
}

/**
 * T16: título, meta description, Open Graph, canonical y JSON-LD por vista.
 * Corre igual en SSR (donde importa para crawlers) y en navegador (títulos de
 * pestaña al navegar). Manipula sólo el `<head>`, así que no afecta hidratación.
 *
 * T26 añade el idioma: `og:locale`, un `hreflang` por variante y un canonical
 * que incluye `?lang=` cuando no se está en el idioma por defecto.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly transloco = inject(TranslocoService);
  private readonly language = inject(LanguageService);

  setPage(page: SeoPage): void {
    this.title.setTitle(page.title);
    const description = page.description.trim().slice(0, 160);
    const image = page.image ?? this.absolute('/assets/images/logos/logo_naranja.png');
    const lang = this.language.current();

    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: page.title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:site_name', content: 'Impulso Jobs' });
    this.meta.updateTag({ property: 'og:image', content: image });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary' });
    this.meta.updateTag({
      property: 'og:locale',
      content: LANGUAGE_LOCALES[lang].replace('-', '_'),
    });

    if (page.canonicalPath) {
      // El canonical de la variante en inglés es su propia URL, no la española:
      // si apuntara a la española, el buscador descartaría la inglesa.
      const url = this.absolute(this.withLanguage(page.canonicalPath, lang));
      this.meta.updateTag({ property: 'og:url', content: url });
      this.upsertCanonical(url);
      this.upsertAlternates(page.canonicalPath);
    } else {
      this.removeCanonical();
      this.removeAlternates();
    }
  }

  /**
   * Versión traducida de `setPage` (T26): además de aplicar el idioma actual,
   * **reescribe el head al cambiar de idioma**, que es cuando el título de la
   * pestaña y la descripción dejarían de corresponder con lo que se ve.
   *
   * Se llama desde el constructor de la página: `takeUntilDestroyed` necesita
   * contexto de inyección y así la suscripción muere con la vista. El primer
   * valor de `langChanges$` llega de forma síncrona, de modo que el HTML que
   * emite SSR ya lleva el head correcto.
   */
  setLocalizedPage(page: LocalizedSeoPage): void {
    this.transloco.langChanges$.pipe(takeUntilDestroyed()).subscribe(() => {
      this.setPage({
        title: this.transloco.translate(page.titleKey),
        description: this.transloco.translate(page.descriptionKey),
        canonicalPath: page.canonicalPath,
        image: page.image,
      });
    });
  }

  /** Inserta/reemplaza un bloque JSON-LD por id; `null` lo elimina. */
  setJsonLd(id: string, data: object | null): void {
    const existing = this.document.getElementById(id);
    existing?.remove();
    if (!data) return;

    const script = this.document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data);
    this.document.head.appendChild(script);
  }

  private absolute(path: string): string {
    return path.startsWith('http') ? path : `${environment.siteUrl}${path}`;
  }

  /**
   * Añade `?lang=` a una ruta del sitio. El idioma por defecto no lo lleva: su
   * URL limpia es la que ya está indexada y la que se comparte.
   */
  private withLanguage(path: string, lang: Language): string {
    if (lang === DEFAULT_LANGUAGE) return path;
    const separator = path.includes('?') ? '&' : '?';
    return `${path}${separator}${LANGUAGE_QUERY_PARAM}=${lang}`;
  }

  /**
   * `hreflang` de cada variante más `x-default`, que apunta a la URL limpia
   * (español). Sin `?lang=` las dos variantes compartirían dirección y no
   * habría nada que declarar.
   */
  private upsertAlternates(path: string): void {
    this.removeAlternates();
    const head = this.document.head;

    for (const lang of SUPPORTED_LANGUAGES) {
      head.appendChild(
        this.alternateLink(
          LANGUAGE_HREFLANG[lang],
          this.absolute(this.withLanguage(path, lang)),
        ),
      );
    }
    head.appendChild(this.alternateLink('x-default', this.absolute(path)));
  }

  private alternateLink(hreflang: string, href: string): HTMLLinkElement {
    const link = this.document.createElement('link');
    link.rel = 'alternate';
    link.hreflang = hreflang;
    link.href = href;
    return link;
  }

  private removeAlternates(): void {
    this.document.head
      .querySelectorAll('link[rel="alternate"][hreflang]')
      .forEach((link) => link.remove());
  }

  private upsertCanonical(url: string): void {
    let link = this.document.head.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    );
    if (!link) {
      link = this.document.createElement('link');
      link.rel = 'canonical';
      this.document.head.appendChild(link);
    }
    link.href = url;
  }

  private removeCanonical(): void {
    this.document.head
      .querySelector('link[rel="canonical"]')
      ?.remove();
  }
}
