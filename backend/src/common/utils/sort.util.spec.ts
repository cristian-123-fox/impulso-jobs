import { buildOrder } from '@/common/utils/sort.util';

const ALLOWED = {
  email: 'email',
  createdAt: 'createdAt',
  company: 'company.legalName',
} as const;

const FALLBACK = { createdAt: 'DESC' as const };

describe('buildOrder', () => {
  it('ordena por la columna pedida cuando está permitida', () => {
    expect(buildOrder('email', 'ASC', ALLOWED, FALLBACK)).toEqual({
      email: 'ASC',
      createdAt: 'DESC',
    });
  });

  it('ignora una columna que no está en la lista blanca', () => {
    // El caso que importa: lo que llega por query string no puede acabar
    // en el ORDER BY sólo por venir bien escrito.
    expect(buildOrder('passwordHash', 'ASC', ALLOWED, FALLBACK)).toEqual(
      FALLBACK,
    );
    expect(
      buildOrder('email; DROP TABLE users', 'ASC', ALLOWED, FALLBACK),
    ).toEqual(FALLBACK);
  });

  it('usa el orden por defecto si no se pide ninguno', () => {
    expect(buildOrder(undefined, undefined, ALLOWED, FALLBACK)).toEqual(
      FALLBACK,
    );
  });

  it('añade el desempate estable detrás de la columna pedida', () => {
    const order = buildOrder('email', 'DESC', ALLOWED, FALLBACK);

    // El orden de las claves es el que TypeORM traduce a ORDER BY.
    expect(Object.keys(order)).toEqual(['email', 'createdAt']);
  });

  it('no duplica el desempate si se ordena por esa misma columna', () => {
    const order = buildOrder('createdAt', 'ASC', ALLOWED, FALLBACK);

    expect(order).toEqual({ createdAt: 'ASC' });
  });

  it('soporta ordenar por una relación', () => {
    expect(buildOrder('company', 'ASC', ALLOWED, FALLBACK)).toEqual({
      company: { legalName: 'ASC' },
      createdAt: 'DESC',
    });
  });

  it('por defecto ordena ascendente si sólo se indica la columna', () => {
    expect(buildOrder('email', undefined, ALLOWED, FALLBACK)).toEqual({
      email: 'ASC',
      createdAt: 'DESC',
    });
  });
});
