import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from 'typeorm';

/**
 * Login con Google (Google Identity Services).
 *
 * Dos cosas:
 *
 * 1. `users.google_id` — el `sub` del token de Google. Se guarda porque el
 *    correo de una cuenta de Google **puede cambiar**: sin el id estable, quien
 *    renombra su dirección acabaría con una cuenta fantasma de segunda. El
 *    índice único es el ancla con la que se vincula la identidad.
 *    (`password_hash` sigue siendo NOT NULL: una cuenta nacida en Google recibe
 *    un hash aleatorio que nadie conoce, de modo que el login por contraseña
 *    falla siempre y el resto del código no tiene que contemplar `null`.)
 *
 * 2. `candidate_profiles`: `document_type`, `document_number` y `birth_date`
 *    pasan a ser anulables. Un aspirante que entra por Google no trae documento
 *    ni fecha de nacimiento — Google no los conoce — y el registro completo es
 *    el único sitio donde se pedían. Preferimos `null` a un dato inventado:
 *    estos campos se rellenan después desde el perfil, y el back-office puede
 *    completar el documento.
 *
 *    El índice único `uq_candidate_profiles_document` sigue valiendo: en
 *    PostgreSQL y en MySQL las filas con `NULL` no colisionan entre sí, así que
 *    pueden convivir cuantos perfiles sin documento haga falta.
 */
export class AddGoogleLogin1720000034000 implements MigrationInterface {
  name = 'AddGoogleLogin1720000034000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('users', [
      new TableColumn({
        name: 'google_id',
        type: 'varchar',
        length: '64',
        isNullable: true,
      }),
    ]);
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'uq_users_google_id',
        columnNames: ['google_id'],
        isUnique: true,
      }),
    );

    await queryRunner.changeColumn(
      'candidate_profiles',
      'document_type',
      new TableColumn({
        name: 'document_type',
        type: 'varchar',
        length: '20',
        isNullable: true,
      }),
    );
    await queryRunner.changeColumn(
      'candidate_profiles',
      'document_number',
      new TableColumn({
        name: 'document_number',
        type: 'varchar',
        length: '40',
        isNullable: true,
      }),
    );
    await queryRunner.changeColumn(
      'candidate_profiles',
      'birth_date',
      new TableColumn({ name: 'birth_date', type: 'date', isNullable: true }),
    );
  }

  /**
   * La vuelta atrás de las columnas anulables sólo funciona si ninguna fila se
   * quedó sin dato: con un `NULL` en medio, el `NOT NULL` no es restaurable y
   * la migración revierte como corresponde — avisando, no a ciegas.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    const rows = (await queryRunner.query(
      `SELECT COUNT(*) AS total FROM candidate_profiles
        WHERE document_type IS NULL
           OR document_number IS NULL
           OR birth_date IS NULL`,
    )) as Array<{ total: number | string }>;
    const total = Number(rows[0]?.total ?? 0);
    if (total > 0) {
      throw new Error(
        `No se puede restaurar NOT NULL: ${total} perfil(es) sin documento o fecha de nacimiento.`,
      );
    }

    await queryRunner.changeColumn(
      'candidate_profiles',
      'document_type',
      new TableColumn({
        name: 'document_type',
        type: 'varchar',
        length: '20',
        isNullable: false,
      }),
    );
    await queryRunner.changeColumn(
      'candidate_profiles',
      'document_number',
      new TableColumn({
        name: 'document_number',
        type: 'varchar',
        length: '40',
        isNullable: false,
      }),
    );
    await queryRunner.changeColumn(
      'candidate_profiles',
      'birth_date',
      new TableColumn({ name: 'birth_date', type: 'date', isNullable: false }),
    );

    const table = await queryRunner.getTable('users');
    const index = table?.indices.find((i) => i.name === 'uq_users_google_id');
    if (index) {
      await queryRunner.dropIndex('users', index);
    }
    await queryRunner.dropColumn('users', 'google_id');
  }
}
