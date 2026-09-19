import {
  documentsOf,
  isDocumentAllowedIn,
} from '@/common/catalogs/identity-documents';
import {
  isValidDocumentNumber,
  normalizeDocumentNumber,
} from '@/common/utils/identity-document.util';

/** Un ejemplo válido y uno inválido por cada uno de los nueve tipos (D-2). */
const CASES: ReadonlyArray<{
  country: string;
  type: string;
  valid: string;
  invalid: string;
}> = [
  {
    country: 'MX',
    type: 'MX_CURP',
    valid: 'GARA900520HDFXXX01',
    invalid: 'GARA900520HDFXXX0',
  },
  { country: 'MX', type: 'MX_RFC', valid: 'GARA900520AB1', invalid: 'GA9005' },
  {
    country: 'MX',
    type: 'MX_INE',
    valid: 'GRARNA90052014H800',
    invalid: 'GRARNA9005',
  },
  { country: 'CO', type: 'CO_CC', valid: '1020123456', invalid: '12345' },
  { country: 'CO', type: 'CO_CE', valid: '1234567', invalid: '12345678' },
  { country: 'CO', type: 'CO_PPT', valid: '1234567', invalid: '123456' },
  { country: 'US', type: 'US_DL', valid: 'D1234567', invalid: 'D12' },
  { country: 'CA', type: 'CA_DL', valid: 'A123456789', invalid: 'A12' },
  { country: 'MX', type: 'PASSPORT', valid: 'AB123456', invalid: 'AB12' },
];

describe('normalizeDocumentNumber', () => {
  it('deja mayúsculas y sólo alfanuméricos', () => {
    // Una cédula colombiana se teclea con puntos y un pasaporte con espacios.
    expect(normalizeDocumentNumber('CO_CC', '1.020.123.456')).toBe(
      '1020123456',
    );
    expect(normalizeDocumentNumber('PASSPORT', 'ab 123 456')).toBe('AB123456');
    expect(normalizeDocumentNumber('CA_DL', 'a1234-56789')).toBe('A123456789');
    expect(normalizeDocumentNumber('MX_CURP', null)).toBe('');
  });
});

describe('isValidDocumentNumber', () => {
  for (const { country, type, valid, invalid } of CASES) {
    it(`acepta un ${type} bien formado y rechaza uno mal formado`, () => {
      expect(isValidDocumentNumber(country, type, valid)).toBe(true);
      expect(isValidDocumentNumber(country, type, invalid)).toBe(false);
    });
  }

  it('normaliza antes de validar', () => {
    expect(isValidDocumentNumber('MX', 'MX_CURP', 'gara900520hdfxxx01')).toBe(
      true,
    );
    expect(isValidDocumentNumber('CO', 'CO_CC', '1.020.123.456')).toBe(true);
  });

  it('rechaza el número vacío', () => {
    expect(isValidDocumentNumber('MX', 'MX_CURP', '')).toBe(false);
    expect(isValidDocumentNumber('MX', 'MX_CURP', null)).toBe(false);
  });

  it('rechaza un tipo que no aplica al país', () => {
    // El caso del `POST` a mano: CURP con país Colombia no puede pasar.
    expect(isValidDocumentNumber('CO', 'MX_CURP', 'GARA900520HDFXXX01')).toBe(
      false,
    );
    expect(isValidDocumentNumber('MX', 'CO_CC', '1020123456')).toBe(false);
  });

  it('rechaza un tipo o un país inexistentes', () => {
    expect(isValidDocumentNumber('AR', 'PASSPORT', 'AB123456')).toBe(false);
    expect(isValidDocumentNumber('MX', 'MX_SSN', '123456789')).toBe(false);
  });
});

describe('catálogo de documentos', () => {
  it('ofrece sólo los documentos del país', () => {
    expect(documentsOf('MX').map((d) => d.code)).toEqual([
      'MX_CURP',
      'MX_RFC',
      'MX_INE',
      'PASSPORT',
    ]);
    expect(documentsOf('CO').map((d) => d.code)).toEqual([
      'CO_CC',
      'CO_CE',
      'CO_PPT',
      'PASSPORT',
    ]);
    expect(documentsOf('US').map((d) => d.code)).toEqual(['US_DL', 'PASSPORT']);
    expect(documentsOf('CA').map((d) => d.code)).toEqual(['CA_DL', 'PASSPORT']);
    expect(documentsOf('AR')).toEqual([]);
  });

  it('acepta el pasaporte en los cuatro países', () => {
    for (const country of ['MX', 'CO', 'US', 'CA']) {
      expect(isDocumentAllowedIn(country, 'PASSPORT')).toBe(true);
      expect(isValidDocumentNumber(country, 'PASSPORT', 'AB123456')).toBe(true);
    }
  });

  it('no ofrece ni SSN ni SIN (decisión D-2, con implicación legal)', () => {
    const codes = ['MX_CURP', 'MX_RFC', 'MX_INE'];
    expect(documentsOf('US').map((d) => d.code)).not.toContain('US_SSN');
    expect(documentsOf('CA').map((d) => d.code)).not.toContain('CA_SIN');
    // Y de paso: los mexicanos no se cuelan en el listado de los otros países.
    for (const code of codes) {
      expect(documentsOf('CO').map((d) => d.code)).not.toContain(code);
    }
  });
});
