import { Injectable, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { LanguageService } from '@/core/i18n/language.service';

/**
 * Traducción **para código**, no para plantillas (T26).
 *
 * En una plantilla se usa `*transloco="let t"`, que Transloco repinta solo al
 * cambiar de idioma. Fuera de ella —un `computed`, una opción de `<select>`, un
 * título de pestaña— `TranslocoService.translate()` devuelve un string suelto y
 * nada avisa de que hay que recalcularlo. Este servicio lee la **señal** de
 * idioma antes de traducir, así que cualquier `computed` que lo llame queda
 * enganchado a ella y se recalcula al cambiar de idioma.
 */
@Injectable({ providedIn: 'root' })
export class AppTranslateService {
  private readonly transloco = inject(TranslocoService);
  private readonly language = inject(LanguageService);

  t(key: string, params?: Record<string, unknown>): string {
    this.language.current();
    return this.transloco.translate(key, params);
  }

  /**
   * Etiqueta de un enum del backend (`FULL_TIME`, `REMOTE`, `HIGH_SCHOOL`…),
   * que viven bajo `enums.<grupo>.<valor>`.
   *
   * Un **valor desconocido se devuelve tal cual** en vez de pintar la clave: la
   * API puede estrenar un valor antes de que el diccionario lo recoja, y es
   * preferible ver `NIGHT_SHIFT` que `enums.workMode.NIGHT_SHIFT`.
   *
   * Los mapas `*_LABELS` de `features/company/vacancies/models` siguen ahí para
   * el área privada, que todavía no está traducida (T26 fase 4). Mientras
   * tanto el español está en los dos sitios; al traducir esas áreas, los mapas
   * desaparecen y todo pasa por aquí.
   */
  enumLabel(group: string, value: string | null | undefined): string {
    if (!value) return '';
    const key = `enums.${group}.${value}`;
    const text = this.t(key);
    return text === key ? value : text;
  }
}
