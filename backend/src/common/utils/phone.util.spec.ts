import {
  formatPhone,
  nationalNumberOf,
  normalizePhone,
} from '@/common/utils/phone.util';

describe('normalizePhone', () => {
  it('acepta el número nacional mexicano tal cual', () => {
    expect(normalizePhone('MX', '3312345678')).toBe('+523312345678');
  });

  it('acepta el indicativo, los espacios y los signos', () => {
    expect(normalizePhone('MX', '+52 33 1234 5678')).toBe('+523312345678');
    expect(normalizePhone('MX', '(33) 1234-5678')).toBe('+523312345678');
    expect(normalizePhone('MX', '00523312345678')).toBe('+523312345678');
  });

  it('no recorta un número nacional que empieza por el indicativo', () => {
    // Es la regresión del `normalizeMxPhone` viejo: su `replace(/^\+?52/, '')`
    // a ciegas dejaba "12345678" y devolvía null. El paso 4 del algoritmo
    // comprueba la longitud resultante antes de recortar, así que este número
    // se queda entero. Este caso no se puede quitar.
    expect(normalizePhone('MX', '5212345678')).toBe('+525212345678');
  });

  it('rechaza lo que no mide exactamente los dígitos del país', () => {
    expect(normalizePhone('MX', '33123456')).toBeNull();
    expect(normalizePhone('MX', '33123456789')).toBeNull();
  });

  it('rechaza el vacío y la basura', () => {
    expect(normalizePhone('MX', '')).toBeNull();
    expect(normalizePhone('MX', 'n/a')).toBeNull();
    expect(normalizePhone('MX', null)).toBeNull();
  });

  it('normaliza Colombia', () => {
    expect(normalizePhone('CO', '3101234567')).toBe('+573101234567');
    expect(normalizePhone('CO', '+57 310 123 4567')).toBe('+573101234567');
  });

  it('normaliza Estados Unidos y Canadá, que comparten el +1', () => {
    expect(normalizePhone('US', '(415) 555-0123')).toBe('+14155550123');
    expect(normalizePhone('CA', '604 555 0123')).toBe('+16045550123');
  });

  it('no confunde Estados Unidos con Canadá: el país lo dice quien llama', () => {
    // El E.164 es idéntico en los dos; lo que distingue es `phone_country`,
    // que es por lo que existe esa columna (D-1). Aquí se comprueba que la
    // función respeta el país que recibe y no intenta deducirlo del prefijo.
    expect(normalizePhone('CA', '+14155550123')).toBe('+14155550123');
    expect(normalizePhone('US', '+14155550123')).toBe('+14155550123');
  });

  it('rechaza un país fuera del alcance', () => {
    expect(normalizePhone('AR', '1123456789')).toBeNull();
    expect(normalizePhone(undefined, '3312345678')).toBeNull();
  });
});

describe('formatPhone', () => {
  it('agrupa según el país', () => {
    expect(formatPhone('MX', '+523312345678')).toBe('+52 33 1234 5678');
    expect(formatPhone('CO', '+573101234567')).toBe('+57 310 123 4567');
    expect(formatPhone('US', '+14155550123')).toBe('+1 415 555 0123');
  });

  it('devuelve el valor tal cual si no encaja con el país', () => {
    // Filas anteriores a la migración, o un país cambiado a mano: esto es
    // presentación y no debe ocultar lo que hay guardado.
    expect(formatPhone('MX', '3312345678')).toBe('3312345678');
    expect(formatPhone('MX', 'n/a')).toBe('n/a');
    expect(formatPhone('MX', null)).toBe('');
  });
});

describe('nationalNumberOf', () => {
  it('quita el indicativo para repintar el formulario', () => {
    expect(nationalNumberOf('MX', '+523312345678')).toBe('3312345678');
    expect(nationalNumberOf('CA', '+16045550123')).toBe('6045550123');
  });

  it('devuelve los dígitos que haya si el valor no encaja', () => {
    expect(nationalNumberOf('MX', '33 1234 5678')).toBe('3312345678');
    expect(nationalNumberOf('MX', '')).toBe('');
  });
});
