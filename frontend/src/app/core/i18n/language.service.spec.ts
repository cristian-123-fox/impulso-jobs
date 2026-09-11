import { TestBed } from '@angular/core/testing';
import { provideTransloco } from '@jsverse/transloco';
import { LANGUAGE_COOKIE } from '@/core/i18n/i18n.config';
import { InlineTranslocoLoader } from '@/core/i18n/transloco.loader';
import { LanguageService } from '@/core/i18n/language.service';

/**
 * El idioma se resuelve de la cookie (y del `?lang=`, que aquí no se puede
 * falsear porque depende de `location`). Esta prueba cubre lo que sí decide el
 * servicio: qué valores acepta y qué hace con uno desconocido (T26).
 */
describe('LanguageService', () => {
  function setup(): LanguageService {
    TestBed.configureTestingModule({
      providers: [
        provideTransloco({
          config: { availableLangs: ['es', 'en'], defaultLang: 'es' },
          loader: InlineTranslocoLoader,
        }),
      ],
    });
    return TestBed.inject(LanguageService);
  }

  function setCookie(value: string): void {
    document.cookie = `${LANGUAGE_COOKIE}=${value}; path=/`;
  }

  afterEach(() => {
    document.cookie = `${LANGUAGE_COOKIE}=; path=/; max-age=0`;
    TestBed.resetTestingModule();
  });

  it('arranca en español cuando no hay cookie', () => {
    expect(setup().resolveInitial()).toBe('es');
  });

  it('respeta la cookie de idioma', () => {
    setCookie('en');
    expect(setup().resolveInitial()).toBe('en');
  });

  it('ignora un idioma que no existe', () => {
    setCookie('fr');
    expect(setup().resolveInitial()).toBe('es');
  });

  it('al cambiar de idioma lo aplica y lo recuerda', () => {
    const languages = setup();
    languages.use('en');

    expect(languages.current()).toBe('en');
    expect(languages.locale()).toBe('en-US');
    expect(document.documentElement.lang).toBe('en');
    expect(document.cookie).toContain(`${LANGUAGE_COOKIE}=en`);
  });
});
