import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * M15 (parte 1): bandeja de la empresa con "no leídos" y scoring de filtrado.
 * Portable a PostgreSQL/MySQL.
 */
export class AddApplicationReadAndScore1720000013000 implements MigrationInterface {
  name = 'AddApplicationReadAndScore1720000013000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'candidate_applications',
      new TableColumn({ name: 'read_at', type: 'timestamp', isNullable: true }),
    );
    await queryRunner.addColumn(
      'candidate_applications',
      new TableColumn({ name: 'score', type: 'int', isNullable: true }),
    );
    await queryRunner.addColumn(
      'candidate_applications',
      new TableColumn({ name: 'is_excluded', type: 'boolean', default: false }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('candidate_applications', 'is_excluded');
    await queryRunner.dropColumn('candidate_applications', 'score');
    await queryRunner.dropColumn('candidate_applications', 'read_at');
  }
}
