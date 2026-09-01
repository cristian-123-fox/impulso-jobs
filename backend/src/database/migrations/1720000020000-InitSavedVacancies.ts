import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * T17 (fase 1): vacantes guardadas por el aspirante. Portable a
 * PostgreSQL/MySQL. Único por (perfil, vacante); el borrado es físico.
 */
export class InitSavedVacancies1720000020000 implements MigrationInterface {
  name = 'InitSavedVacancies1720000020000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'saved_vacancies',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'candidate_profile_id', type: 'varchar', length: '36' },
          { name: 'vacancy_id', type: 'varchar', length: '36' },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          { name: 'deleted_at', type: 'timestamp', isNullable: true },
        ],
      }),
      true,
    );

    const indexes: [string, string[], boolean][] = [
      ['idx_saved_vacancies_profile_id', ['candidate_profile_id'], false],
      [
        'uq_saved_vacancies_profile_vacancy',
        ['candidate_profile_id', 'vacancy_id'],
        true,
      ],
    ];
    for (const [name, columnNames, isUnique] of indexes) {
      await queryRunner.createIndex(
        'saved_vacancies',
        new TableIndex({ name, columnNames, isUnique }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('saved_vacancies', true);
  }
}
