import { FindOptionsOrder, ObjectLiteral } from 'typeorm';
import { SortOrder } from '@/common/dto/sortable-query.dto';

/**
 * Traduce el par (`sortBy`, `sortOrder`) que llega por query string a un
 * `order` de TypeORM, **pasando siempre por un mapa de columnas permitidas**.
 * Lo que envía el cliente es una clave, nunca un nombre de columna: si no
 * está en el mapa, se ignora y se usa el orden por defecto.
 *
 * El `fallback` se añade además como desempate estable. Sin él, ordenar por
 * una columna con valores repetidos (el estado, el rol) deja la paginación
 * indefinida: la misma fila puede salir en la página 1 y en la 2, o en
 * ninguna. Es el fallo clásico de "ordenar por columna no única".
 */
export function buildOrder<T extends ObjectLiteral>(
  sortBy: string | undefined,
  sortOrder: SortOrder | undefined,
  allowed: Readonly<Record<string, string>>,
  fallback: FindOptionsOrder<T>,
): FindOptionsOrder<T> {
  const path = sortBy ? allowed[sortBy] : undefined;
  if (!path) return fallback;

  const order: Record<string, unknown> = {};
  setPath(order, path, sortOrder ?? 'ASC');

  // El desempate va detrás: TypeORM respeta el orden de las claves.
  for (const [key, value] of Object.entries(fallback)) {
    if (!(key in order)) order[key] = value;
  }
  return order as FindOptionsOrder<T>;
}

/** Soporta rutas anidadas (`company.legalName`) para ordenar por relación. */
function setPath(
  target: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const parts = path.split('.');
  let node = target;
  for (const part of parts.slice(0, -1)) {
    node[part] ??= {};
    node = node[part] as Record<string, unknown>;
  }
  node[parts[parts.length - 1]] = value;
}
