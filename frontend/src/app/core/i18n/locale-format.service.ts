import { Injectable, computed, inject } from '@angular/core';
import { LanguageService } from '@/core/i18n/language.service';

/** Moneda del portal. Los importes son siempre MXN (T26 §6). */
const CURRENCY = 'MXN';

/**
 * Fechas e importes en el idioma activo (T26 §6).
 *
 * Existe porque el portal formateaba con `Intl.*('es-MX')` escrito a mano en
 * cada componente: con dos idiomas eso deja "15 de marzo de 2026" y "$25,000.00"
 * en medio de una página en inglés. Aquí el locale sale de la señal de idioma,
 * así que cualquier `computed` que llame a estos métodos se recalcula solo al
 * cambiar de idioma — sin recargar y sin pasar el locale por parámetro.
 *
 * La **moneda no cambia**: un sueldo en pesos sigue siendo en pesos en inglés;
 * lo que cambia es cómo se escribe la cifra (`$25,000` vs `MX$25,000`).
 */
@Injectable({ providedIn: 'root' })
export class LocaleFormatService {
  private readonly language = inject(LanguageService);

  /** Locale activo, para quien necesite pasarlo a un pipe de Angular. */
  readonly locale = this.language.locale;

  private readonly currencyFormatter = computed(
    () =>
      new Intl.NumberFormat(this.locale(), {
        style: 'currency',
        currency: CURRENCY,
        maximumFractionDigits: 0,
      }),
  );

  private readonly longDateFormatter = computed(
    () => new Intl.DateTimeFormat(this.locale(), { dateStyle: 'long' }),
  );

  private readonly shortDateFormatter = computed(
    () =>
      new Intl.DateTimeFormat(this.locale(), {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
  );

  private readonly dateOnlyFormatter = computed(
    () =>
      new Intl.DateTimeFormat(this.locale(), {
        dateStyle: 'long',
        timeZone: 'UTC',
      }),
  );

  /**
   * 25000 → "$25,000" / "MX$25,000". Sin decimales por defecto: el uso normal
   * son sueldos, no facturas.
   *
   * `fractionDigits: 2` es para lo contrario —un importe que alguien tecleó y
   * espera ver tal cual, como el desglose de IVA de una venta (T34)—, donde
   * redondear a pesos enteros haría que la cifra mostrada no cuadrase con la
   * cobrada.
   */
  currency(amount: number, fractionDigits = 0): string {
    if (fractionDigits === 0) return this.currencyFormatter().format(amount);
    return new Intl.NumberFormat(this.locale(), {
      style: 'currency',
      currency: CURRENCY,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(amount);
  }

  /** "2026-03-15" → "15 de marzo de 2026" / "March 15, 2026". */
  longDate(value: string | Date): string {
    return this.longDateFormatter().format(toDate(value));
  }

  /** "2026-03-15" → "15 mar 2026" / "Mar 15, 2026". */
  shortDate(value: string | Date): string {
    return this.shortDateFormatter().format(toDate(value));
  }

  /**
   * Fecha **sin hora** (`YYYY-MM-DD`) en formato largo. Se fuerza UTC porque
   * una fecha límite no tiene hora: interpretarla en la zona del navegador la
   * corre un día hacia atrás en todo México.
   */
  dateOnly(value: string): string {
    return this.dateOnlyFormatter().format(new Date(`${value}T00:00:00Z`));
  }

  /** 1240 → "1,240" / "1,240", con el separador del idioma activo. */
  number(value: number): string {
    return value.toLocaleString(this.locale());
  }
}

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}
