import en from '@/core/i18n/translations/en.json';
import es from '@/core/i18n/translations/es.json';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '@/core/i18n/i18n.config';

type Dictionary = { [key: string]: string | Dictionary };

/** Aplana `{a: {b: 'x'}}` en `{'a.b': 'x'}` para poder comparar juegos de claves. */
function flatten(dictionary: Dictionary, prefix = ''): Map<string, string> {
  const flat = new Map<string, string>();
  for (const [key, value] of Object.entries(dictionary)) {
    const path = `${prefix}${key}`;
    if (typeof value === 'string') {
      flat.set(path, value);
    } else {
      for (const [nested, text] of flatten(value, `${path}.`)) {
        flat.set(nested, text);
      }
    }
  }
  return flat;
}

/** Nombres de los parámetros de una traducción: `{{name}}` → `name`. */
function params(text: string): string[] {
  return [...text.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)]
    .map((match) => match[1])
    .sort();
}

/**
 * Guardas del diccionario (T26).
 *
 * Traducir es fácil de dejar a medias: se añade una clave en español y se
 * olvida el inglés, o se renombra un parámetro en una sola versión y la frase
 * sale con un hueco. Esto lo detecta en la suite en vez de en producción.
 */
describe('diccionarios de traducción', () => {
  const flatEs = flatten(es as Dictionary);
  const flatEn = flatten(en as Dictionary);

  it('el idioma por defecto está entre los soportados', () => {
    expect(SUPPORTED_LANGUAGES).toContain(DEFAULT_LANGUAGE);
  });

  it('tiene exactamente las mismas claves en los dos idiomas', () => {
    const soloEs = [...flatEs.keys()].filter((key) => !flatEn.has(key));
    const soloEn = [...flatEn.keys()].filter((key) => !flatEs.has(key));

    expect(soloEs).withContext('claves sin traducir al inglés').toEqual([]);
    expect(soloEn).withContext('claves que faltan en español').toEqual([]);
  });

  it('no tiene textos vacíos', () => {
    const vacias = [...flatEs, ...flatEn]
      .filter(([, text]) => text.trim() === '')
      .map(([key]) => key);

    expect(vacias).toEqual([]);
  });

  it('usa los mismos parámetros en ambos idiomas', () => {
    const distintas = [...flatEs]
      .filter(([key, text]) => {
        const other = flatEn.get(key);
        return other !== undefined && params(text).join() !== params(other).join();
      })
      .map(([key]) => key);

    expect(distintas).toEqual([]);
  });
});
