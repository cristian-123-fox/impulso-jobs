import {
  emptyPhoneValue,
  formatPhone,
  fromPhonePayload,
  nationalNumberOf,
  normalizePhone,
  toPhonePayload,
} from '@/shared/utils/phone';

/**
 * Mismos casos que `backend/src/common/utils/phone.util.spec.ts`: las dos
 * implementaciones tienen que coincidir, porque el usuario ve el mensaje del
 * frontend y el servidor decide (D-7). Si una cambia y la otra no, esto salta.
 */
describe('normalizePhone', () => {
  it('normaliza México en sus varias formas', () => {
    expect(normalizePhone('MX', '3312345678')).toBe('+523312345678');
    expect(normalizePhone('MX', '+52 33 1234 5678')).toBe('+523312345678');
    expect(normalizePhone('MX', '(33) 1234-5678')).toBe('+523312345678');
    expect(normalizePhone('MX', '00523312345678')).toBe('+523312345678');
  });

  it('no recorta un número nacional que empieza por el indicativo', () => {
    expect(normalizePhone('MX', '5212345678')).toBe('+525212345678');
  });

  it('rechaza longitudes que no son las del país', () => {
    expect(normalizePhone('MX', '33123456')).toBeNull();
    expect(normalizePhone('MX', '33123456789')).toBeNull();
    expect(normalizePhone('MX', 'n/a')).toBeNull();
  });

  it('normaliza Colombia, Estados Unidos y Canadá', () => {
    expect(normalizePhone('CO', '3101234567')).toBe('+573101234567');
    expect(normalizePhone('US', '(415) 555-0123')).toBe('+14155550123');
    expect(normalizePhone('CA', '604 555 0123')).toBe('+16045550123');
  });

  it('rechaza un país fuera del alcance', () => {
    expect(normalizePhone('AR', '1123456789')).toBeNull();
  });
});

describe('formatPhone', () => {
  it('agrupa según el país', () => {
    expect(formatPhone('MX', '+523312345678')).toBe('+52 33 1234 5678');
    expect(formatPhone('CO', '+573101234567')).toBe('+57 310 123 4567');
    expect(formatPhone('CA', '+16045550123')).toBe('+1 604 555 0123');
  });

  it('devuelve el valor tal cual si no encaja con el país', () => {
    expect(formatPhone('MX', '3312345678')).toBe('3312345678');
    expect(formatPhone('MX', null)).toBe('');
  });
});

describe('ida y vuelta con la API', () => {
  it('conserva el país cuando el E.164 es ambiguo (+1)', () => {
    const value = fromPhonePayload('+14155550123', 'CA');
    expect(value.country).toBe('CA');
    expect(toPhonePayload(value)).toEqual({
      phone: '+14155550123',
      phoneCountry: 'CA',
    });
  });

  it('cae al país por defecto cuando la fila no trae phoneCountry', () => {
    // Filas anteriores a T36: tienen teléfono y no tienen país.
    expect(fromPhonePayload('+523312345678', null)).toEqual({
      country: 'MX',
      national: '3312345678',
      e164: '+523312345678',
    });
  });

  it('un teléfono sin país no inventa uno cuando está vacío', () => {
    expect(toPhonePayload(emptyPhoneValue('US'))).toEqual({
      phone: null,
      phoneCountry: null,
    });
  });

  it('nationalNumberOf quita el indicativo', () => {
    expect(nationalNumberOf('MX', '+523312345678')).toBe('3312345678');
    expect(nationalNumberOf('MX', null)).toBe('');
  });
});
