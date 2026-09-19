import { MigrationInterface, QueryRunner } from 'typeorm';

/** Carácter de reemplazo U+FFFD: lo que queda cuando un byte no se pudo decodificar. */
const BROKEN = '�';

interface Repair {
  readonly table: string;
  readonly column: string;
  /** Fragmento tal y como quedó guardado, con el U+FFFD dentro. */
  readonly broken: string;
  readonly fixed: string;
}

/**
 * Reparaciones a nivel de **fragmento**, no de valor completo: así una misma
 * regla arregla las dos notificaciones que sólo se diferencian en la fecha, y
 * no hay que enumerar textos largos que se rompen al copiarlos.
 *
 * Cada fragmento se acotó a la columna donde se encontró (un barrido de todas
 * las columnas de texto de la base, ejecutado antes de escribir esto), para no
 * tocar en ciego datos que nadie ha revisado.
 */
const REPAIRS: readonly Repair[] = [
  // Rol personalizado creado a mano desde /admin/roles.
  {
    table: 'roles',
    column: 'description',
    broken: `cat${BROKEN}logos`,
    fixed: 'catálogos',
  },
  // Nombre del plan, capturado en /admin/planes…
  {
    table: 'plans',
    column: 'name',
    broken: `Suscripci${BROKEN}n`,
    fixed: 'Suscripción',
  },
  // …y copiado tal cual dentro del texto de los avisos de vencimiento (T22).
  {
    table: 'notifications',
    column: 'body',
    broken: `Suscripci${BROKEN}n`,
    fixed: 'Suscripción',
  },
  {
    table: 'companies',
    column: 'economic_sector',
    broken: `Tecnolog${BROKEN}a`,
    fixed: 'Tecnología',
  },
  {
    table: 'companies',
    column: 'company_description',
    broken: `tecnolog${BROKEN}a`,
    fixed: 'tecnología',
  },
  {
    table: 'vacancies',
    column: 'requirements',
    broken: `a${BROKEN}os`,
    fixed: 'años',
  },
  {
    table: 'vacancies',
    column: 'municipality',
    broken: `Cuauht${BROKEN}moc`,
    fixed: 'Cuauhtémoc',
  },
];

/**
 * Repara los textos que se guardaron con caracteres perdidos: «Suscripci□n
 * Anual», «Tecnolog□a», «Cuauht□moc»…
 *
 * **Por qué no se puede automatizar la deducción.** U+FFFD no es una doble
 * codificación (`Ã³` por `ó`), que sí sería reversible byte a byte: es la marca
 * de que el byte original **ya se perdió** al decodificar. Sólo se sabe que ahí
 * había *un* carácter. Por eso la corrección va escrita a mano, palabra por
 * palabra, deduciendo del español cuál era la vocal — un barrido previo
 * confirmó que sólo hay estos siete fragmentos y ninguna doble codificación.
 *
 * **De dónde vino.** No de las semillas: `seed-candidate.ts` escribe bien
 * «Cuauhtémoc». Entró por escrituras hechas desde una consola con la
 * codificación equivocada, así que `pnpm seed` no lo reintroduce y esta
 * reparación única basta.
 *
 * Es idempotente: al terminar, ningún `LIKE '%□%'` casa, y volver a ejecutarla
 * no cambia nada.
 */
export class RepairMojibakeText1720000030000 implements MigrationInterface {
  name = 'RepairMojibakeText1720000030000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const escape = (identifier: string): string =>
      queryRunner.connection.driver.escape(identifier);

    for (const { table, column, broken, fixed } of REPAIRS) {
      const t = escape(table);
      const c = escape(column);
      // Parámetros y no literales: el driver se encarga de transportar el
      // U+FFFD sin depender de la codificación del cliente — que es justo lo
      // que rompió estos textos en su día.
      const p = (index: number): string =>
        queryRunner.connection.driver.createParameter(`p${index}`, index);

      const affected = (await queryRunner.query(
        `SELECT count(*) AS n FROM ${t} WHERE ${c} LIKE ${p(0)}`,
        [`%${broken}%`],
      )) as { n: string | number }[];
      const count = Number(affected[0]?.n ?? 0);
      if (count === 0) continue;

      await queryRunner.query(
        `UPDATE ${t} SET ${c} = REPLACE(${c}, ${p(0)}, ${p(1)}) WHERE ${c} LIKE ${p(2)}`,
        [broken, fixed, `%${broken}%`],
      );
      console.log(`  ${table}.${column}: ${count} fila(s) → "${fixed}"`);
    }
  }

  /**
   * No se revierte **a propósito**.
   *
   * Deshacer esto significaría volver a meter el carácter roto buscando el
   * texto corregido, y esa búsqueda también encontraría las filas que nacieron
   * bien —una notificación nueva, una vacante escrita después— y las
   * estropearía. Revertir una reparación no tiene ningún valor y sí un daño
   * cierto, así que `down` se queda vacío.
   */
  public async down(): Promise<void> {
    // Intencionadamente vacío (ver el comentario de arriba).
  }
}
