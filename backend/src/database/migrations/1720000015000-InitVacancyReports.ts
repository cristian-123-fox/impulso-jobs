import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/** Denuncias de vacantes por candidatos. Portable a PostgreSQL/MySQL. */
export class InitVacancyReports1720000015000 implements MigrationInterface {
  name = 'InitVacancyReports1720000015000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'vacancy_reports',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'vacancy_id', type: 'varchar', length: '36' },
          { name: 'reporter_user_id', type: 'varchar', length: '36' },
          { name: 'reason_code', type: 'varchar', length: '40' },
          { name: 'comment', type: 'varchar', length: '500', isNullable: true },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'PENDING'",
          },
          { name: 'resolved_at', type: 'timestamp', isNullable: true },
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

    for (const [name, columnNames, isUnique] of [
      ['idx_vacancy_reports_vacancy_id', ['vacancy_id'], false],
      ['idx_vacancy_reports_status', ['status'], false],
      [
        'uq_vacancy_reports_vacancy_reporter',
        ['vacancy_id', 'reporter_user_id'],
        true,
      ],
    ] as [string, string[], boolean][]) {
      await queryRunner.createIndex(
        'vacancy_reports',
        new TableIndex({ name, columnNames, isUnique }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('vacancy_reports', true);
  }
}
