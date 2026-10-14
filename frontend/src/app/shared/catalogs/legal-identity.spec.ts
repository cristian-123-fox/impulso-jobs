import { fillIdentityTokens, LEGAL_IDENTITY } from './legal.catalogs';
import { legalContent } from '@/features/public/legal/content/legal-content';
import type { LegalContentKey } from '@/features/public/legal/content/legal-content.models';

/**
 * Los documentos se escriben con `{{RFC}}` y compañía para no tener el dato
 * pegado en dos idiomas. Esta es la costura que los convierte en texto
 * publicable: si el token no se sustituye, el lector ve las llaves.
 */
describe('marcadores del responsable', () => {
  const KEYS = [
    'privacy',
    'terms',
    'cookies',
    'refund',
    'imageRights',
  ] as const satisfies readonly LegalContentKey[];

  it('sustituye un marcador conocido por el dato del catálogo', () => {
    expect(fillIdentityTokens('RFC: {{RFC}}')).toBe(`RFC: ${LEGAL_IDENTITY.rfc}`);
    expect(fillIdentityTokens('Nombre: {{LEGAL_NAME}}')).toBe(
      `Nombre: ${LEGAL_IDENTITY.legalName}`,
    );
  });

  it('deja intacto un marcador que no corresponde a ningún campo', () => {
    expect(fillIdentityTokens('{{NO_EXISTE}}')).toBe('{{NO_EXISTE}}');
  });

  it('no toca el texto que no lleva marcadores', () => {
    const texto = 'Aviso de privacidad sin nada que sustituir.';
    expect(fillIdentityTokens(texto)).toBe(texto);
  });

  it('deja el catálogo sin mutar entre llamadas', () => {
    const primera = fillIdentityTokens('{{RFC}}');
    const segunda = fillIdentityTokens('{{RFC}}');

    expect(segunda).toBe(primera);
    expect(LEGAL_IDENTITY.rfc).toBe(LEGAL_IDENTITY.rfc);
  });

  for (const lang of ['es', 'en'] as const) {
    it(`publica el ${lang} sin llaves de marcador sin resolver`, () => {
      for (const key of KEYS) {
        const texto = JSON.stringify(legalContent(key, lang));
        expect(texto).not.toMatch(/\{\{[A-Z_]+\}\}/);
      }
    });
  }

  it('sustituye dentro de tablas y listas, no sólo en el texto suelto', () => {
    const privacidad = legalContent('privacy', 'es');
    const tabla = privacidad.sections.flatMap((s) => s.table?.rows ?? []);
    const todo = JSON.stringify(tabla);
    expect(tabla.length).toBeGreaterThan(0);
    expect(todo).not.toMatch(/\{\{[A-Z_]+\}\}/);
  });
});