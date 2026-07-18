import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class AddCandidateProfileSettings1720000007000 implements MigrationInterface {
  name = 'AddCandidateProfileSettings1720000007000';

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
        name: 'candidate_profile_settings',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'candidate_profile_id', type: 'varchar', length: '36' },
          {
            name: 'profile_visibility',
            type: 'varchar',
            length: '20',
            default: "'PUBLIC'",
          },
          {
            name: 'information_visibility',
            type: 'varchar',
            length: '20',
            default: "'FULL'",
          },
          { name: 'is_immediately_available', type: 'boolean', default: false },
          ...this.timestamps(),
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'candidate_profile_settings',
      new TableIndex({
        name: 'uq_candidate_profile_settings_profile_id',
        columnNames: ['candidate_profile_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createForeignKey(
      'candidate_profile_settings',
      new TableForeignKey({
        name: 'fk_candidate_profile_settings_profile',
        columnNames: ['candidate_profile_id'],
        referencedTableName: 'candidate_profiles',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('candidate_profile_settings', true);
  }
}
