import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * T25: skills normalizadas y relación vacancy_skills.
 * Portable a PostgreSQL/MySQL (uuid como varchar(36)).
 */
export class InitVacancySkills1720000023000 implements MigrationInterface {
  name = 'InitVacancySkills1720000023000';

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
    // Tabla de skills normalizadas
    await queryRunner.createTable(
      new Table({
        name: 'skills',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'name', type: 'varchar', length: '100' },
          { name: 'slug', type: 'varchar', length: '120' },
          ...this.timestamps(),
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'skills',
      new TableIndex({
        name: 'idx_skills_slug_unique',
        columnNames: ['slug'],
        isUnique: true,
      }),
    );

    // Tabla pivote vacancy ↔ skill
    await queryRunner.createTable(
      new Table({
        name: 'vacancy_skills',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'vacancy_id', type: 'varchar', length: '36' },
          { name: 'skill_id', type: 'varchar', length: '36' },
          { name: 'is_required', type: 'boolean', default: false },
          { name: 'sort_order', type: 'smallint', default: 0 },
          ...this.timestamps(),
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'vacancy_skills',
      new TableIndex({
        name: 'idx_vacancy_skills_vacancy_id',
        columnNames: ['vacancy_id'],
      }),
    );
    await queryRunner.createIndex(
      'vacancy_skills',
      new TableIndex({
        name: 'idx_vacancy_skills_skill_id',
        columnNames: ['skill_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('vacancy_skills', true);
    await queryRunner.dropTable('skills', true);
  }
}
