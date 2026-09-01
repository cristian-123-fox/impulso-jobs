import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableIndex,
} from 'typeorm';

/**
 * M15 (parte 2): preguntas de filtrado (killer questions) y capacidades de
 * plan sobre la vacante. Portable a PostgreSQL/MySQL (uuid como varchar(36)).
 */
export class InitVacancyScreening1720000014000 implements MigrationInterface {
  name = 'InitVacancyScreening1720000014000';

  private timestamps() {
    return [
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
    ];
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'vacancies',
      new TableColumn({
        name: 'can_be_confidential',
        type: 'boolean',
        default: false,
      }),
    );
    await queryRunner.addColumn(
      'vacancies',
      new TableColumn({
        name: 'screening_enabled',
        type: 'boolean',
        default: false,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'vacancy_questions',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'vacancy_id', type: 'varchar', length: '36' },
          { name: 'question_text', type: 'varchar', length: '200' },
          { name: 'question_type', type: 'varchar', length: '10' },
          { name: 'sort_order', type: 'smallint', default: 0 },
          ...this.timestamps(),
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'vacancy_questions',
      new TableIndex({
        name: 'idx_vacancy_questions_vacancy_id',
        columnNames: ['vacancy_id'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'vacancy_question_options',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'question_id', type: 'varchar', length: '36' },
          { name: 'option_text', type: 'varchar', length: '200' },
          { name: 'weight', type: 'smallint' },
          { name: 'sort_order', type: 'smallint', default: 0 },
          ...this.timestamps(),
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'vacancy_question_options',
      new TableIndex({
        name: 'idx_vacancy_question_options_question_id',
        columnNames: ['question_id'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'application_answers',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'application_id', type: 'varchar', length: '36' },
          { name: 'question_id', type: 'varchar', length: '36' },
          { name: 'question_text', type: 'varchar', length: '200' },
          {
            name: 'option_id',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          { name: 'answer_text', type: 'varchar', length: '1000' },
          { name: 'weight', type: 'smallint', isNullable: true },
          ...this.timestamps(),
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'application_answers',
      new TableIndex({
        name: 'idx_application_answers_application_id',
        columnNames: ['application_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('application_answers', true);
    await queryRunner.dropTable('vacancy_question_options', true);
    await queryRunner.dropTable('vacancy_questions', true);
    await queryRunner.dropColumn('vacancies', 'screening_enabled');
    await queryRunner.dropColumn('vacancies', 'can_be_confidential');
  }
}
