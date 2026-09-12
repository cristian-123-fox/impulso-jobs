import { randomUUID } from 'node:crypto';
import type { QueryRunner } from 'typeorm';

/**
 * Utilidades para **sembrar datos desde una migración**, que es como entran los
 * catálogos nuevos a partir de ahora (ver CLAUDE.md § "Semillas y datos").
 *
 * Por qué aquí y no en un seeder: una migración corre sola en el despliegue
 * (`migration:run:prod`), deja constancia en la tabla `migrations` y no se
 * repite. Un seeder depende de que alguien se acuerde de ejecutarlo — y cuando
 * no se ejecuta, la app responde 403 o se queda sin catálogo sin avisar.
 *
 * Dos reglas que hacen que esto funcione a largo plazo:
 *
 * 1. **Nada de entidades ni repositorios.** Una migración es inmutable: describe
 *    el esquema tal como era el día que se escribió. Si importara una entidad,
 *    un cambio futuro en esa entidad rompería una migración vieja. Por eso aquí
 *    todo es SQL con nombres de tabla y columna literales.
 * 2. **Portable a PostgreSQL y MySQL.** Los identificadores se escapan con el
 *    driver (`"x"` en PG, `` `x` `` en MySQL) y los parámetros se generan con
 *    `createParameter` (`$1` en PG, `?` en MySQL). Escribir `"tabla"` a mano
 *    revienta en MySQL con ER_PARSE_ERROR 1064.
 *
 * Los ids son UUID v4 generados en Node, igual que `BaseEntity`: el esquema no
 * depende de extensiones de BD.
 *
 * @example Migración de datos típica — añadir estados nuevos a un catálogo:
 * ```ts
 * const ROWS = [
 *   { code: 'HIRED', name: 'Contratado', sort_order: 8, is_final: true },
 * ];
 *
 * export class AddHiredApplicationStatus1720000026000
 *   implements MigrationInterface
 * {
 *   name = 'AddHiredApplicationStatus1720000026000';
 *
 *   public async up(queryRunner: QueryRunner): Promise<void> {
 *     await upsertSeedRows(queryRunner, {
 *       table: 'application_status',
 *       matchBy: ['code'],
 *       rows: ROWS,
 *     });
 *   }
 *
 *   public async down(queryRunner: QueryRunner): Promise<void> {
 *     await deleteSeedRows(queryRunner, {
 *       table: 'application_status',
 *       column: 'code',
 *       values: ROWS.map((r) => r.code),
 *     });
 *   }
 * }
 * ```
 */

export type SeedRow = Record<string, unknown>;

export interface UpsertSeedOptions {
  /** Tabla destino, p. ej. `'application_status'`. */
  table: string;
  /** Columnas que identifican la fila. Normalmente `['code']`. */
  matchBy: readonly string[];
  /** Filas a sembrar, sin `id` ni timestamps (se rellenan solos). */
  rows: readonly SeedRow[];
  /**
   * Columnas a refrescar cuando la fila ya existe. Por defecto, todas las de
   * `rows` menos las de `matchBy`. Pasa `[]` para "insertar si falta y no tocar
   * lo existente" — útil cuando el back-office puede haber editado el dato.
   */
  updateColumns?: readonly string[];
  /** La tabla tiene `id` UUID (`BaseEntity`). Default `true`. */
  withId?: boolean;
  /** La tabla tiene `created_at` / `updated_at`. Default `true`. */
  withTimestamps?: boolean;
}

export interface UpsertSeedResult {
  created: number;
  updated: number;
}

/** Genera placeholders correlativos y portables para una misma consulta. */
function parameterFactory(queryRunner: QueryRunner): () => string {
  let index = 0;
  return () =>
    queryRunner.connection.driver.createParameter(`p${index}`, index++);
}

/**
 * Inserta las filas que falten y actualiza las que ya estén. Idempotente: se
 * puede correr contra una BD virgen y contra una donde el seeder equivalente ya
 * pasó, sin duplicar.
 */
export async function upsertSeedRows(
  queryRunner: QueryRunner,
  options: UpsertSeedOptions,
): Promise<UpsertSeedResult> {
  const {
    table,
    matchBy,
    rows,
    updateColumns,
    withId = true,
    withTimestamps = true,
  } = options;

  if (matchBy.length === 0) {
    throw new Error(`upsertSeedRows(${table}): matchBy no puede estar vacío.`);
  }

  const escape = (identifier: string): string =>
    queryRunner.connection.driver.escape(identifier);
  const result: UpsertSeedResult = { created: 0, updated: 0 };

  for (const row of rows) {
    for (const column of matchBy) {
      if (row[column] === undefined) {
        throw new Error(
          `upsertSeedRows(${table}): la fila no trae la columna de búsqueda "${column}".`,
        );
      }
    }

    const selectParam = parameterFactory(queryRunner);
    const whereSql = matchBy
      .map((column) => `${escape(column)} = ${selectParam()}`)
      .join(' AND ');
    const whereValues = matchBy.map((column) => row[column]);

    const found = (await queryRunner.query(
      `SELECT ${escape('id')} FROM ${escape(table)} WHERE ${whereSql} LIMIT 1`,
      whereValues,
    )) as Array<{ id: string }>;

    if (found.length === 0) {
      const values: SeedRow = { ...row };
      if (withId && values.id === undefined) values.id = randomUUID();
      if (withTimestamps) {
        const now = new Date();
        values.created_at ??= now;
        values.updated_at ??= now;
      }

      const columns = Object.keys(values);
      const insertParam = parameterFactory(queryRunner);
      await queryRunner.query(
        `INSERT INTO ${escape(table)} (${columns.map(escape).join(', ')}) ` +
          `VALUES (${columns.map(() => insertParam()).join(', ')})`,
        columns.map((column) => values[column]),
      );
      result.created += 1;
      continue;
    }

    const patchColumns = (
      updateColumns ??
      Object.keys(row).filter((column) => !matchBy.includes(column))
    ).filter((column) => row[column] !== undefined);

    if (patchColumns.length === 0) continue;

    const patch: SeedRow = {};
    for (const column of patchColumns) patch[column] = row[column];
    if (withTimestamps) patch.updated_at = new Date();

    const updateParam = parameterFactory(queryRunner);
    const setSql = Object.keys(patch)
      .map((column) => `${escape(column)} = ${updateParam()}`)
      .join(', ');
    const idSql = `${escape('id')} = ${updateParam()}`;

    await queryRunner.query(
      `UPDATE ${escape(table)} SET ${setSql} WHERE ${idSql}`,
      [...Object.values(patch), found[0].id],
    );
    result.updated += 1;
  }

  return result;
}

export interface DeleteSeedOptions {
  table: string;
  /** Columna que identifica las filas a borrar, p. ej. `'code'`. */
  column: string;
  /** Valores a borrar. */
  values: readonly unknown[];
}

/**
 * Borra las filas sembradas. Para el `down()` de la migración.
 *
 * Sólo borra lo que la migración puso: nunca un `DELETE` sin `WHERE`. Si el dato
 * ya está en uso (una FK apunta a él), el borrado fallará — y es lo correcto:
 * revertir no debe llevarse por delante datos de producción en silencio.
 */
export async function deleteSeedRows(
  queryRunner: QueryRunner,
  options: DeleteSeedOptions,
): Promise<void> {
  const { table, column, values } = options;
  if (values.length === 0) return;

  const escape = (identifier: string): string =>
    queryRunner.connection.driver.escape(identifier);
  const param = parameterFactory(queryRunner);

  await queryRunner.query(
    `DELETE FROM ${escape(table)} ` +
      `WHERE ${escape(column)} IN (${values.map(() => param()).join(', ')})`,
    [...values],
  );
}
