import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class ExtendCandidateProfileDetails1720000005000 implements MigrationInterface {
  name = 'ExtendCandidateProfileDetails1720000005000';

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
    await queryRunner.addColumns('candidate_profiles', [
      new TableColumn({
        name: 'summary',
        type: 'text',
        isNullable: true,
      }),
      new TableColumn({
        name: 'address',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
      new TableColumn({
        name: 'profile_photo_url',
        type: 'varchar',
        length: '500',
        isNullable: true,
      }),
    ]);

    await queryRunner.createTable(
      new Table({
        name: 'languages',
        columns: [
          { name: 'code', type: 'varchar', length: '10', isPrimary: true },
          { name: 'name', type: 'varchar', length: '80' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'candidate_experiences',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'candidate_profile_id', type: 'varchar', length: '36' },
          { name: 'job_title', type: 'varchar', length: '120' },
          { name: 'company_name', type: 'varchar', length: '160' },
          { name: 'location', type: 'varchar', length: '120' },
          { name: 'start_date', type: 'date' },
          { name: 'end_date', type: 'date', isNullable: true },
          { name: 'is_current', type: 'boolean', default: false },
          { name: 'responsibilities', type: 'text', isNullable: true },
          ...this.timestamps(),
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'candidate_experiences',
      new TableIndex({
        name: 'idx_candidate_experiences_profile_id',
        columnNames: ['candidate_profile_id'],
      }),
    );
    await queryRunner.createForeignKey(
      'candidate_experiences',
      new TableForeignKey({
        name: 'fk_candidate_experiences_profile',
        columnNames: ['candidate_profile_id'],
        referencedTableName: 'candidate_profiles',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'candidate_educations',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'candidate_profile_id', type: 'varchar', length: '36' },
          { name: 'institution_name', type: 'varchar', length: '160' },
          { name: 'education_level', type: 'varchar', length: '40' },
          { name: 'degree_name', type: 'varchar', length: '160' },
          {
            name: 'field_of_study',
            type: 'varchar',
            length: '160',
            isNullable: true,
          },
          { name: 'start_date', type: 'date' },
          { name: 'end_date', type: 'date', isNullable: true },
          { name: 'is_current', type: 'boolean', default: false },
          { name: 'description', type: 'text', isNullable: true },
          ...this.timestamps(),
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'candidate_educations',
      new TableIndex({
        name: 'idx_candidate_educations_profile_id',
        columnNames: ['candidate_profile_id'],
      }),
    );
    await queryRunner.createForeignKey(
      'candidate_educations',
      new TableForeignKey({
        name: 'fk_candidate_educations_profile',
        columnNames: ['candidate_profile_id'],
        referencedTableName: 'candidate_profiles',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'candidate_languages',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'candidate_profile_id', type: 'varchar', length: '36' },
          { name: 'language_code', type: 'varchar', length: '10' },
          { name: 'level', type: 'varchar', length: '20' },
          { name: 'is_native', type: 'boolean', default: false },
          ...this.timestamps(),
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'candidate_languages',
      new TableIndex({
        name: 'uq_candidate_languages_profile_language',
        columnNames: ['candidate_profile_id', 'language_code'],
        isUnique: true,
      }),
    );
    await queryRunner.createForeignKey(
      'candidate_languages',
      new TableForeignKey({
        name: 'fk_candidate_languages_profile',
        columnNames: ['candidate_profile_id'],
        referencedTableName: 'candidate_profiles',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
    await queryRunner.createForeignKey(
      'candidate_languages',
      new TableForeignKey({
        name: 'fk_candidate_languages_language',
        columnNames: ['language_code'],
        referencedTableName: 'languages',
        referencedColumnNames: ['code'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'candidate_skills',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'candidate_profile_id', type: 'varchar', length: '36' },
          { name: 'name', type: 'varchar', length: '100' },
          { name: 'level', type: 'varchar', length: '20', isNullable: true },
          { name: 'years_experience', type: 'int', isNullable: true },
          ...this.timestamps(),
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'candidate_skills',
      new TableIndex({
        name: 'idx_candidate_skills_profile_id',
        columnNames: ['candidate_profile_id'],
      }),
    );
    await queryRunner.createForeignKey(
      'candidate_skills',
      new TableForeignKey({
        name: 'fk_candidate_skills_profile',
        columnNames: ['candidate_profile_id'],
        referencedTableName: 'candidate_profiles',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.manager
      .createQueryBuilder()
      .insert()
      .into('languages')
      .values([
        { code: 'ES', name: 'Español' },
        { code: 'EN', name: 'Inglés' },
        { code: 'PT', name: 'Portugués' },
        { code: 'FR', name: 'Francés' },
        { code: 'DE', name: 'Alemán' },
        { code: 'IT', name: 'Italiano' },
        { code: 'JA', name: 'Japonés' },
        { code: 'ZH', name: 'Chino mandarín' },
        { code: 'KO', name: 'Coreano' },
        { code: 'NL', name: 'Neerlandés' },
      ])
      .execute();
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('candidate_skills', true);
    await queryRunner.dropTable('candidate_languages', true);
    await queryRunner.dropTable('candidate_educations', true);
    await queryRunner.dropTable('candidate_experiences', true);
    await queryRunner.dropTable('languages', true);
    await queryRunner.dropColumn('candidate_profiles', 'profile_photo_url');
    await queryRunner.dropColumn('candidate_profiles', 'address');
    await queryRunner.dropColumn('candidate_profiles', 'summary');
  }
}
