import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableIndex,
} from 'typeorm';

/**
 * T18: contador de vistas por vacante — tabla de eventos crudos + contador
 * consolidado en la vacante (lo actualiza `views:consolidate` una vez al día).
 * Portable a PostgreSQL/MySQL.
 */
export class InitVacancyViews1720000018000 implements MigrationInterface {
  name = 'InitVacancyViews1720000018000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'vacancy_view_events',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
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
    await queryRunner.createIndex(
      'vacancy_view_events',
      new TableIndex({
        name: 'idx_vacancy_view_events_vacancy_id',
        columnNames: ['vacancy_id'],
      }),
    );
    await queryRunner.addColumn(
      'vacancies',
      new TableColumn({ name: 'views_count', type: 'int', default: 0 }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('vacancies', 'views_count');
    await queryRunner.dropTable('vacancy_view_events', true);
  }
}
