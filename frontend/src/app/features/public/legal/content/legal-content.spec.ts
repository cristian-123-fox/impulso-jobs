import { LEGAL_CONTENT_EN } from './legal-content.en';
import { LEGAL_CONTENT_ES } from './legal-content.es';
import { CONTENT_BY_DOC_CODE, legalContent } from './legal-content';
import { LEGAL_DOCUMENTS, versionOf } from '@/shared/catalogs/legal.catalogs';

const KEYS = Object.keys(LEGAL_CONTENT_ES) as (keyof typeof LEGAL_CONTENT_ES)[];

/**
 * Los cinco documentos están emparejados por ley: si el inglés se queda corto,
 * la mitad del mercado se queda sin aviso, y eso no es una versión menor del
 * mismo documento sino ninguno. Estos tests hacen que la omisión sea visible en
 * el CI y no en un reporte.
 */
describe('legalContent', () => {
  it('tiene los mismos documentos en español y en inglés', () => {
    expect(Object.keys(LEGAL_CONTENT_EN).sort()).toEqual(KEYS.slice().sort());
  });

  for (const key of KEYS) {
    describe(key, () => {
      it('tiene las mismas secciones y en el mismo orden en ambos idiomas', () => {
        const es = LEGAL_CONTENT_ES[key].sections.map((s) => s.id);
        const en = LEGAL_CONTENT_EN[key].sections.map((s) => s.id);

        expect(en).toEqual(es);
      });

      it('no deja ninguna sección vacía en ningún idioma', () => {
        for (const content of [LEGAL_CONTENT_ES[key], LEGAL_CONTENT_EN[key]]) {
          expect(content.intro.length).toBeGreaterThan(80);
          expect(content.summary.length).toBeGreaterThan(2);
          expect(content.closing.length).toBeGreaterThan(40);
          expect(content.sections.length).toBeGreaterThan(2);

          for (const section of content.sections) {
            expect(section.heading.length).toBeGreaterThan(3);
            expect(section.id).toMatch(/^[a-z-]+$/);
          }
        }
      });

      it('no deja marcadores de plantilla sin sustituir', () => {
        // Los `{{...}}` del aviso de privacidad son intencionales: son los
        // campos que el responsable rellena desde `legal.catalogs.ts`. Lo que no
        // puede quedar es texto corrupto de una edición a medias.
        for (const content of [LEGAL_CONTENT_ES[key], LEGAL_CONTENT_EN[key]]) {
          const text = JSON.stringify(content);
          expect(text).not.toContain('PENDIENTE');
          expect(text).not.toMatch(/[一-鿿]/);
        }
      });
    });
  }

  it('resuelve el contenido del idioma pedido', () => {
    // La sustitución de marcadores devuelve una copia con los datos del
    // responsable, así que no se puede comparar por identidad con el catálogo.
    // Lo que importa es que cada idioma traiga el suyo y que sea estable.
    const es = legalContent('privacy', 'es');
    const en = legalContent('privacy', 'en');

    expect(es.sections.map((s) => s.id)).toEqual(
      LEGAL_CONTENT_ES['privacy'].sections.map((s) => s.id),
    );
    expect(en.sections.map((s) => s.id)).toEqual(
      LEGAL_CONTENT_EN['privacy'].sections.map((s) => s.id),
    );
    expect(es.intro).not.toBe(en.intro);
    expect(legalContent('privacy', 'es')).toEqual(es);
  });

  it('cae al español si el idioma no está en el diccionario', () => {
    // Una página legal vacía rompe el build; una que reserva al usuario sin
    // decirle nada en su idioma es un incumplimiento silencioso. El español
    // como último recurso es menos malo.
    const fallback = legalContent(
      'terms',
      'de' as unknown as Parameters<typeof legalContent>[1],
    );

    expect(fallback).toEqual(legalContent('terms', 'es'));
  });
});

describe('catálogo de documentos legales', () => {
  it('da a cada documento una ruta bajo /legal', () => {
    for (const doc of LEGAL_DOCUMENTS) {
      expect(doc.route).toMatch(/^\/legal\/[a-z-]+(#.+)?$/);
    }
  });

  it('no repite ruta ni código', () => {
    const routes = LEGAL_DOCUMENTS.map((doc) => doc.route);
    const codes = LEGAL_DOCUMENTS.map((doc) => doc.code);

    expect(new Set(routes).size).toBe(routes.length);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('exige Términos y Aviso, y deja el resto como accesorio', () => {
    const byCode = Object.fromEntries(
      LEGAL_DOCUMENTS.map((doc) => [doc.code, doc]),
    );

    expect(byCode['TERMS'].required).toBeTrue();
    expect(byCode['PRIVACY'].required).toBeTrue();
    // Negarse a las cookies o al reembolso no puede impedir usar el servicio:
    // el art. 16 de la LFPDPPP obliga a informar, no a aceptar para navegar.
    expect(byCode['COOKIES'].required).toBeFalse();
    expect(byCode['REFUND'].required).toBeFalse();
  });

  it('da versión y fecha a todos los documentos', () => {
    for (const doc of LEGAL_DOCUMENTS) {
      expect(versionOf(doc.code)).toMatch(/^\d+\.\d+\.\d+$/);
      expect(doc.effectiveDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

describe('mapeo contenido ↔ documento', () => {
  it('cubre todos los códigos del catálogo', () => {
    for (const doc of LEGAL_DOCUMENTS) {
      expect(CONTENT_BY_DOC_CODE[doc.code]).toBeDefined();
    }
  });
});