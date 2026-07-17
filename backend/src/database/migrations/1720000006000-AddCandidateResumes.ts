import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class AddCandidateResumes1720000006000 implements MigrationInterface {
  name = 'AddCandidateResumes1720000006000';

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
    await queryRunner.createTable(
      new Table({
        name: 'candidate_resumes',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'candidate_profile_id', type: 'varchar', length: '36' },
          { name: 'file_name', type: 'varchar', length: '255' },
          { name: 'file_url', type: 'varchar', length: '500' },
          { name: 'file_size', type: 'int' },
          { name: 'mime_type', type: 'varchar', length: '100' },
          { name: 'storage_key', type: 'varchar', length: '500' },
          { name: 'is_default', type: 'boolean', default: false },
          ...this.timestamps(),
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'candidate_resumes',
      new TableIndex({
        name: 'idx_candidate_resumes_profile_id',
        columnNames: ['candidate_profile_id'],
      }),
    );

    await queryRunner.createIndex(
      'candidate_resumes',
      new TableIndex({
        name: 'idx_candidate_resumes_default',
        columnNames: ['candidate_profile_id', 'is_default'],
      }),
    );

    await queryRunner.createForeignKey(
      'candidate_resumes',
      new TableForeignKey({
        name: 'fk_candidate_resumes_profile',
        columnNames: ['candidate_profile_id'],
        referencedTableName: 'candidate_profiles',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('candidate_resumes', true);
  }
}
