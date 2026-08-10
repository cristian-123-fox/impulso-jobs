import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * M11: postulaciones, catálogo de estados e historial de transiciones.
 * Portable a PostgreSQL/MySQL (uuid como varchar(36)).
 *
 * El catálogo `application_status` se llena con `pnpm seed:applications`; las
 * migraciones de este repo sólo crean esquema.
 *
 * `application_answers` (respuestas a las preguntas de filtrado) llegará con
 * M15, junto a `vacancy_questions`: sin esa tabla no hay a qué referenciar.
 */
export class InitApplications1720000010000 implements MigrationInterface {
  name = 'InitApplications1720000010000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'application_status',
        columns: [
          { name: 'code', type: 'varchar', length: '30', isPrimary: true },
          { name: 'name', type: 'varchar', length: '80' },
          {
            name: 'description',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          { name: 'sort_order', type: 'smallint', default: 0 },
          { name: 'is_final', type: 'boolean', default: false },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'candidate_applications',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'candidate_profile_id', type: 'varchar', length: '36' },
          { name: 'vacancy_id', type: 'varchar', length: '36' },
          { name: 'company_id', type: 'varchar', length: '36' },
          {
            name: 'resume_id',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          { name: 'status_code', type: 'varchar', length: '30' },
          { name: 'applied_at', type: 'timestamp' },
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

    // Un aspirante no puede postularse dos veces a la misma vacante.
    await queryRunner.createIndex(
      'candidate_applications',
      new TableIndex({
        name: 'uq_candidate_applications_profile_vacancy',
        columnNames: ['candidate_profile_id', 'vacancy_id'],
        isUnique: true,
      }),
    );
    await queryRunner.createIndex(
      'candidate_applications',
      new TableIndex({
        name: 'idx_candidate_applications_profile_id',
        columnNames: ['candidate_profile_id'],
      }),
    );
    await queryRunner.createIndex(
      'candidate_applications',
      new TableIndex({
        name: 'idx_candidate_applications_vacancy_id',
        columnNames: ['vacancy_id'],
      }),
    );
    await queryRunner.createIndex(
      'candidate_applications',
      new TableIndex({
        name: 'idx_candidate_applications_company_id',
        columnNames: ['company_id'],
      }),
    );
    await queryRunner.createIndex(
      'candidate_applications',
      new TableIndex({
        name: 'idx_candidate_applications_status_code',
        columnNames: ['status_code'],
      }),
    );
    // El listado del reclutador filtra por empresa + vacante + estado.
    await queryRunner.createIndex(
      'candidate_applications',
      new TableIndex({
        name: 'idx_candidate_applications_company_filter',
        columnNames: ['company_id', 'vacancy_id', 'status_code'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'application_status_history',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'application_id', type: 'varchar', length: '36' },
          {
            name: 'previous_status_code',
            type: 'varchar',
            length: '30',
            isNullable: true,
          },
          { name: 'current_status_code', type: 'varchar', length: '30' },
          {
            name: 'changed_by',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          { name: 'changed_at', type: 'timestamp' },
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
      'application_status_history',
      new TableIndex({
        name: 'idx_application_status_history_application_id',
        columnNames: ['application_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('application_status_history', true);
    await queryRunner.dropTable('candidate_applications', true);
    await queryRunner.dropTable('application_status', true);
  }
}
