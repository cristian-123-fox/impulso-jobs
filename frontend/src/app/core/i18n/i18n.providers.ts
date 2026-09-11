import {
  EnvironmentProviders,
  LOCALE_ID,
  Provider,
  inject,
  isDevMode,
  provideAppInitializer,
} from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEn from '@angular/common/locales/en';
import localeEsMx from '@angular/common/locales/es-MX';
import { firstValueFrom } from 'rxjs';
import { TranslocoService, provideTransloco } from '@jsverse/transloco';
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_LOCALES,
  SUPPORTED_LANGUAGES,
} from '@/core/i18n/i18n.config';
import { LanguageService } from '@/core/i18n/language.service';
import { InlineTranslocoLoader } from '@/core/i18n/transloco.loader';

// Fechas y moneda MXN por locale (T26 §6). Se registran los dos de golpe: son
// pequeños y evitan una carga diferida en mitad de un cambio de idioma.
registerLocaleData(localeEsMx);
registerLocaleData(localeEn);

/**
 * i18n del portal (T26). Transloco con diccionarios JSON en runtime — un solo
 * bundle y un solo proceso Node SSR, que es lo que permite el despliegue en
 * cPanel; `@angular/localize` habría pedido una app por idioma.
 */
export function provideI18n(): (Provider | EnvironmentProviders)[] {
  return [
    provideTransloco({
      config: {
        availableLangs: [...SUPPORTED_LANGUAGES],
        defaultLang: DEFAULT_LANGUAGE,
        fallbackLang: DEFAULT_LANGUAGE,
        // Una clave sin traducir cae al español en vez de pintar la clave.
        missingHandler: { useFallbackTranslation: true, logMissingKey: isDevMode() },
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: InlineTranslocoLoader,
    }),
    // `LOCALE_ID` se resuelve una sola vez, así que fija el locale de los pipes
    // de Angular para toda la carga. Es correcto al entrar y tras recargar,
    // pero no reacciona a un cambio de idioma en caliente: lo que sí reacciona
    // —y es lo que usa el portal para fechas e importes— es
    // `LocaleFormatService`, cuyo locale sale de una señal.
    {
      provide: LOCALE_ID,
      useFactory: () => LANGUAGE_LOCALES[inject(LanguageService).current()],
    },
    // El diccionario tiene que estar cargado **antes** del primer render: si
    // no, SSR emitiría el HTML con las claves y el idioma "aparecería" luego.
    provideAppInitializer(async () => {
      const languages = inject(LanguageService);
      const lang = languages.resolveInitial();
      languages.initialize(lang);
      await firstValueFrom(inject(TranslocoService).load(lang));
    }),
  ];
}
