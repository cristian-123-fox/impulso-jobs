import { Injectable } from '@angular/core';
import { Translation, TranslocoLoader } from '@jsverse/transloco';
import { DEFAULT_LANGUAGE, Language } from '@/core/i18n/i18n.config';

/**
 * Carga los diccionarios con `import()` en vez de pedirlos por HTTP.
 *
 * El loader HTTP que trae Transloco por defecto necesita una URL absoluta al
 * renderizar en servidor (allí no hay origen relativo) y añade una petición de
 * red antes del primer pintado. Importándolos, el bundler los parte en chunks
 * por idioma, el servidor los resuelve del disco y el navegador sólo descarga
 * el del idioma activo.
 */
const LOADERS: Record<Language, () => Promise<{ default: Translation }>> = {
  es: () => import('./translations/es.json'),
  en: () => import('./translations/en.json'),
};

@Injectable({ providedIn: 'root' })
export class InlineTranslocoLoader implements TranslocoLoader {
  async getTranslation(lang: string): Promise<Translation> {
    const load = LOADERS[lang as Language] ?? LOADERS[DEFAULT_LANGUAGE];
    const module = await load();
    return module.default;
  }
}
