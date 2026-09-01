import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { environment } from '@env';

export interface SeoPage {
  title: string;
  description: string;
  /** Ruta absoluta dentro del sitio (`/vacantes/...`); arma el canonical y og:url. */
  canonicalPath?: string;
  /** URL absoluta de imagen para OG; por defecto el logo. */
  image?: string;
}

/**
 * T16: título, meta description, Open Graph, canonical y JSON-LD por vista.
 * Corre igual en SSR (donde importa para crawlers) y en navegador (títulos de
 * pestaña al navegar). Manipula sólo el `<head>`, así que no afecta hidratación.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  setPage(page: SeoPage): void {
    this.title.setTitle(page.title);
    const description = page.description.trim().slice(0, 160);
    const image = page.image ?? this.absolute('/assets/images/logos/logo_naranja.png');

    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: page.title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:site_name', content: 'Impulso Jobs' });
    this.meta.updateTag({ property: 'og:image', content: image });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary' });

    if (page.canonicalPath) {
      const url = this.absolute(page.canonicalPath);
      this.meta.updateTag({ property: 'og:url', content: url });
      this.upsertCanonical(url);
    } else {
      this.removeCanonical();
    }
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
