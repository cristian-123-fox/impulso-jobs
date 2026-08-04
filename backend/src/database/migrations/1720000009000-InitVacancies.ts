import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * M10: vacantes. Portable a PostgreSQL/MySQL (uuid como varchar(36), montos en
 * decimal). Los distintivos y `max_pauses` los alimentará M14 (planes).
 */
export class InitVacancies1720000009000 implements MigrationInterface {
  name = 'InitVacancies1720000009000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'vacancies',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'company_id', type: 'varchar', length: '36' },
          { name: 'title', type: 'varchar', length: '160' },
          { name: 'description', type: 'text' },
          { name: 'requirements', type: 'text', isNullable: true },
          { name: 'employment_type', type: 'varchar', length: '20' },
          { name: 'work_mode', type: 'varchar', length: '20' },
          { name: 'state', type: 'varchar', length: '10' },
          { name: 'municipality', type: 'varchar', length: '120' },
          { name: 'experience_level', type: 'varchar', length: '20' },
          {
            name: 'salary_min',
            type: 'decimal',
            precision: 12,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'salary_max',
            type: 'decimal',
            precision: 12,
            scale: 2,
            isNullable: true,
          },
          { name: 'salary_hidden', type: 'boolean', default: false },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'ACTIVE'",
          },
          { name: 'published_at', type: 'timestamp', isNullable: true },
          { name: 'closed_at', type: 'timestamp', isNullable: true },
          { name: 'is_verified', type: 'boolean', default: false },
          { name: 'is_featured', type: 'boolean', default: false },
          { name: 'is_urgent', type: 'boolean', default: false },
          { name: 'is_confidential', type: 'boolean', default: false },
          { name: 'pause_count', type: 'int', default: 0 },
          { name: 'max_pauses', type: 'int', default: 2 },
          {
            name: 'can_edit_title_on_reactivate',
            type: 'boolean',
            default: false,
          },
          { name: 'refreshed_at', type: 'timestamp', isNullable: true },
          {
            name: 'created_at',
            type: 'timestamp',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
          },
          { name: 'deleted_at', type: 'timestamp', isNullable: true },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'vacancies',
      new TableIndex({
        name: 'idx_vacancies_company_id',
        columnNames: ['company_id'],
      }),
    );
    await queryRunner.createIndex(
      'vacancies',
      new TableIndex({
        name: 'idx_vacancies_status',
        columnNames: ['status'],
      }),
    );
    await queryRunner.createIndex(
      'vacancies',
      new TableIndex({
        name: 'idx_vacancies_refreshed_at',
        columnNames: ['refreshed_at'],
      }),
    );
    // El listado público filtra por estado y ordena por prioridad.
    await queryRunner.createIndex(
      'vacancies',
      new TableIndex({
        name: 'idx_vacancies_public_order',
        columnNames: ['status', 'is_featured', 'is_urgent'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('vacancies', true);
  }
}
