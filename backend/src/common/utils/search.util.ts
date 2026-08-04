import { FindOperator, Raw } from 'typeorm';

/**
 * Coincidencia parcial insensible a mayúsculas, portable entre PostgreSQL y
 * MySQL.
 *
 * `Like` no sirve: en PostgreSQL distingue mayúsculas y en MySQL no (depende de
 * la *collation*), así que el mismo buscador daría resultados distintos en
 * desarrollo y en producción. `ILIKE` tampoco, porque es exclusivo de
 * PostgreSQL. Comparando ambos lados en minúsculas el resultado es el mismo en
 * los dos motores.
 *
 * @param param Nombre del parámetro SQL; debe ser único dentro de la consulta
 *              cuando se combinan varias condiciones en un OR.
 */
export function containsInsensitive(
  term: string,
  param: string,
): FindOperator<string> {
  const value = `%${term.trim().toLowerCase()}%`;
  return Raw((alias) => `LOWER(${alias}) LIKE :${param}`, { [param]: value });
}
