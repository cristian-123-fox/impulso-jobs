import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from 'typeorm';

/**
 * Aspirantes de México, Colombia, Estados Unidos y Canadá (T36).
 *
 * Cuatro cosas, en este orden: columnas nuevas de país (documento y teléfono),
 * remapeo de los valores de `document_type`, normalización de los teléfonos que
 * nunca pasaron por un normalizador, y el índice único del documento, que pasa
 * a ser por país y tipo.
 *
 * **Nada de entidades ni utilidades de la aplicación aquí dentro.** Una
 * migración describe el esquema del día que se escribió: si importara
 * `normalizePhone`, un cambio futuro en esa función cambiaría lo que hizo esta
 * migración en su día. El normalizador mexicano va copiado abajo, minúsculo y
 * congelado a propósito.
 */

/** Valores viejos de `document_type` → valores nuevos con prefijo de país. */
const DOCUMENT_TYPE_REMAP: ReadonlyArray<{ from: string; to: string }> = [
  { from: 'CURP', to: 'MX_CURP' },
  { from: 'RFC', to: 'MX_RFC' },
  { from: 'INE', to: 'MX_INE' },
  // Ojo: el valor almacenado era la palabra en español, no un código.
  { from: 'Pasaporte', to: 'PASSPORT' },
];

/** Tablas con teléfono en crudo que hay que pasar a E.164 mexicano. */
const PHONE_TABLES: ReadonlyArray<{ table: string; column: string }> = [
  { table: 'candidate_profiles', column: 'phone' },
  { table: 'users', column: 'phone' },
];

const LEGACY_DOCUMENT_INDEX = 'uq_candidate_profiles_document_number';
const DOCUMENT_INDEX = 'uq_candidate_profiles_document';

/**
 * Copia congelada del normalizador para México, el único país que puede haber
 * en la base cuando esto corre. No recorta el `52` a ciegas: sólo si lo que
 * queda mide exactamente 10 dígitos (es el defecto que arrastraba
 * `normalizeMxPhone`).
 */
function normalizeMxPhoneAtMigrationTime(raw: string): string | null {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 10) return `+52${digits}`;
  if (digits.length === 12 && digits.startsWith('52')) {
    return `+${digits}`;
  }
  return null;
}

export class InitMultiCountryCandidate1720000031000 implements MigrationInterface {
  name = 'InitMultiCountryCandidate1720000031000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1 · País del documento y del teléfono en el perfil del aspirante.
    await queryRunner.addColumns('candidate_profiles', [
      new TableColumn({
        name: 'document_country',
        type: 'varchar',
        length: '2',
        isNullable: false,
        default: "'MX'",
      }),
      new TableColumn({
        name: 'phone_country',
        type: 'varchar',
        length: '2',
        isNullable: true,
      }),
    ]);

    // 2 y 3 · Mismo país de teléfono en la cuenta y en la empresa.
    await queryRunner.addColumns('users', [
      new TableColumn({
        name: 'phone_country',
        type: 'varchar',
        length: '2',
        isNullable: true,
      }),
    ]);
    await queryRunner.addColumns('companies', [
      new TableColumn({
        name: 'phone_country',
        type: 'varchar',
        length: '2',
        isNullable: true,
      }),
    ]);

    // 4 · Remapeo de `document_type`.
    await this.remapDocumentTypes(queryRunner, DOCUMENT_TYPE_REMAP);

    // 5 · `phone_country = 'MX'` sólo donde hay teléfono.
    await this.backfillPhoneCountry(queryRunner);

    // 6 · Normalización de los teléfonos ya guardados.
    await this.normalizeStoredPhones(queryRunner);

    // 7 · El documento pasa a ser único por país y tipo.
    const table = await queryRunner.getTable('candidate_profiles');
    const legacy = table?.indices.find(
      (index) => index.name === LEGACY_DOCUMENT_INDEX,
    );
    if (legacy) {
      await queryRunner.dropIndex('candidate_profiles', legacy);
    }
    // El índice nuevo es **más laxo** que el que sustituye, así que no puede
    // fallar por duplicados preexistentes: es el sentido seguro del cambio.
    await queryRunner.createIndex(
      'candidate_profiles',
      new TableIndex({
        name: DOCUMENT_INDEX,
        columnNames: ['document_country', 'document_type', 'document_number'],
        isUnique: true,
      }),
    );
  }

  /**
   * Revierte todo **menos la normalización de teléfonos**: no se guardó el
   * valor anterior, así que no hay a dónde volver. Es el mismo criterio de
   * `1720000030000`: revertir una reparación de datos no aporta nada y sí puede
   * estropear filas que ya estaban bien.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('candidate_profiles');
    const current = table?.indices.find(
      (index) => index.name === DOCUMENT_INDEX,
    );
    if (current) {
      await queryRunner.dropIndex('candidate_profiles', current);
    }

    try {
      await queryRunner.createIndex(
        'candidate_profiles',
        new TableIndex({
          name: LEGACY_DOCUMENT_INDEX,
          columnNames: ['document_number'],
          isUnique: true,
        }),
      );
    } catch (error) {
      // Si entretanto entraron dos documentos con el mismo número en países
      // distintos, el índice viejo ya no cabe. Es correcto que falle, pero el
      // error del driver no dice por qué.
      throw new Error(
        'No se puede restaurar el índice único global sobre ' +
          'candidate_profiles.document_number: hay números repetidos entre ' +
          'países o tipos de documento, que el esquema anterior no admitía. ' +
          'Resuelve los duplicados antes de revertir. ' +
          `Error original: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    await this.remapDocumentTypes(
      queryRunner,
      DOCUMENT_TYPE_REMAP.map(({ from, to }) => ({ from: to, to: from })),
    );

    await queryRunner.dropColumn('companies', 'phone_country');
    await queryRunner.dropColumn('users', 'phone_country');
    await queryRunner.dropColumn('candidate_profiles', 'phone_country');
    await queryRunner.dropColumn('candidate_profiles', 'document_country');
  }

  /**
   * Los valores viajan como **parámetros** y no como literales: el driver los
   * transporta sin depender de la codificación del cliente, que es lo que
   * corrompió textos en su día (ver `1720000030000`).
   */
  private async remapDocumentTypes(
    queryRunner: QueryRunner,
    pairs: ReadonlyArray<{ from: string; to: string }>,
  ): Promise<void> {
    const escape = (identifier: string): string =>
      queryRunner.connection.driver.escape(identifier);
    const table = escape('candidate_profiles');
    const column = escape('document_type');

    for (const { from, to } of pairs) {
      const p = (index: number): string =>
        queryRunner.connection.driver.createParameter(`p${index}`, index);
      await queryRunner.query(
        `UPDATE ${table} SET ${column} = ${p(0)} WHERE ${column} = ${p(1)}`,
        [to, from],
      );
    }
  }

  /**
   * `'MX'` sólo donde el teléfono existe y no está en blanco. Dejar `NULL`
   * donde no hay teléfono: un país de teléfono sin teléfono es ruido.
   */
  private async backfillPhoneCountry(queryRunner: QueryRunner): Promise<void> {
    const escape = (identifier: string): string =>
      queryRunner.connection.driver.escape(identifier);
    const targets = [
      ...PHONE_TABLES,
      { table: 'companies', column: 'phone_number' },
    ];

    for (const { table, column } of targets) {
      const t = escape(table);
      const c = escape(column);
      const country = escape('phone_country');
      const p = (index: number): string =>
        queryRunner.connection.driver.createParameter(`p${index}`, index);
      await queryRunner.query(
        `UPDATE ${t} SET ${country} = ${p(0)} ` +
          `WHERE ${c} IS NOT NULL AND ${c} <> ${p(1)}`,
        ['MX', ''],
      );
    }
  }

  /**
   * `candidate_profiles.phone` y `users.phone` nunca pasaron por un
   * normalizador: en la base conviven `3312345678`, `33 1234 5678` y
   * `(33) 1234-5678`. Aquí pasan a E.164.
   *
   * ⚠️ **Lo que no encaje se deja como está y se escribe en el log con su id.**
   * Una migración que aborta por una fila con `"n/a"` en el teléfono deja el
   * despliegue roto; una que salta esa fila deja un dato a corregir en la
   * siguiente edición del perfil. Lo segundo es recuperable, lo primero no.
   */
  private async normalizeStoredPhones(queryRunner: QueryRunner): Promise<void> {
    const escape = (identifier: string): string =>
      queryRunner.connection.driver.escape(identifier);

    for (const { table, column } of PHONE_TABLES) {
      const t = escape(table);
      const c = escape(column);
      const id = escape('id');

      const rows = (await queryRunner.query(
        `SELECT ${id} AS id, ${c} AS phone FROM ${t} WHERE ${c} IS NOT NULL AND ${c} <> ''`,
      )) as Array<{ id: string; phone: string | null }>;

      let updated = 0;
      const skipped: string[] = [];

      for (const row of rows) {
        const raw = (row.phone ?? '').trim();
        if (!raw) continue;
        const normalized = normalizeMxPhoneAtMigrationTime(raw);
        if (!normalized) {
          skipped.push(`${row.id} ("${raw}")`);
          continue;
        }
        if (normalized === raw) continue;

        const p = (index: number): string =>
          queryRunner.connection.driver.createParameter(`p${index}`, index);
        await queryRunner.query(
          `UPDATE ${t} SET ${c} = ${p(0)} WHERE ${id} = ${p(1)}`,
          [normalized, row.id],
        );
        updated += 1;
      }

      if (updated > 0) {
        console.log(`  ${table}.${column}: ${updated} teléfono(s) a E.164`);
      }
      if (skipped.length > 0) {
        console.warn(
          `  ${table}.${column}: ${skipped.length} sin normalizar (se dejan tal cual): ` +
            skipped.join(', '),
        );
      }
    }
  }
}
