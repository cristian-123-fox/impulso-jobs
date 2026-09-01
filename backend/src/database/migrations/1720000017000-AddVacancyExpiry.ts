import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from 'typeorm';

/**
 * T20: vigencia de la publicación. Las vacantes existentes quedan con
 * `expires_at` NULL (nunca vencen): el reloj sólo aplica a publicaciones
 * nuevas, para no matar de golpe lo ya publicado. Portable PostgreSQL/MySQL.
 */
export class AddVacancyExpiry1720000017000 implements MigrationInterface {
  name = 'AddVacancyExpiry1720000017000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'vacancies',
      new TableColumn({
        name: 'expires_at',
        type: 'timestamp',
        isNullable: true,
      }),
    );
    await queryRunner.createIndex(
      'vacancies',
      new TableIndex({
        name: 'idx_vacancies_expires_at',
        columnNames: ['expires_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('vacancies', 'idx_vacancies_expires_at');
    await queryRunner.dropColumn('vacancies', 'expires_at');
  }
}
