import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Reparación: `DEFAULT CURRENT_TIMESTAMP` en las marcas de tiempo del módulo
 * legal.
 *
 * ## Qué pasó
 *
 * `InitLegal` creó `legal_documents` y `legal_consents` con `{ name:
 * 'created_at', type: 'timestamp' }`, sin `default` ni `isNullable: false`. En
 * `users` y en el resto del esquema la columna sí lleva
 * `default: 'CURRENT_TIMESTAMP'`, y esa diferencia es la que rompe los inserts:
 * TypeORM se apoya en el default de la base y, sin él, manda `NULL` contra una
 * columna `NOT NULL`.
 *
 * Salió al intentar registrar el primer consentimiento de verdad: el alta por
 * Google respondía 500 con «el valor nulo en la columna created_at de la
 * relación legal_consents viola la restricción de no nulo». Es decir, **ningún
 * alta con consentimiento había funcionado jamás**; sólo se descubrió al
 * ejecutar la ruta, porque las pruebas unitarias usan dobles.
 *
 * `legal_documents` tenía el mismo defecto, escondido porque esa tabla la
 * escriben migraciones y no el runtime.
 *
 * ## Por qué una migración nueva
 *
 * `InitLegal` ya está aplicada en los entornos donde se ha ejecutado, y una
 * migración es inmutable: editar su contenido no cambia lo que corrió, sólo
 * crea una diferencia entre el archivo y la base. Por eso se repara con un
 * `changeColumn` aparte. `InitLegal` queda como está, a propósito.
 *
 * ## Por qué `changeColumn` y no SQL a mano
 *
 * `MODIFY COLUMN` es de MySQL y `ALTER COLUMN … SET DEFAULT` es de PostgreSQL.
 * `changeColumn` genera el ALTER correcto a partir de la definición completa de
 * la columna, que es lo mismo que hace `new Table({ columns })` en el resto de
 * las migraciones del repo.
 */
const TABLES: readonly string[] = ['legal_consents', 'legal_documents'];

const timestampColumn = (name: string): TableColumn =>
  new TableColumn({
    name,
    type: 'timestamp',
    isNullable: false,
    default: 'CURRENT_TIMESTAMP',
  });

export class AddLegalTimestampsDefault1720000037000 implements MigrationInterface {
  name = 'AddLegalTimestampsDefault1720000037000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of TABLES) {
      await queryRunner.changeColumn(
        table,
        'created_at',
        timestampColumn('created_at'),
      );
      await queryRunner.changeColumn(
        table,
        'updated_at',
        timestampColumn('updated_at'),
      );
    }
  }

  /**
   * No deshace nada: quitar el default sería volver al estado roto, que es
   * justo lo que esta migración arregla. `down` existe porque la interfaz de
   * TypeORM lo exige.
   */
  public down(queryRunner: QueryRunner): Promise<void> {
    void queryRunner;
    return Promise.resolve();
  }
}
