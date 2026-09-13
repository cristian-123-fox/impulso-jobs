import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddCandidatePhoneAndAdminNotes1720000026000
  implements MigrationInterface
{
  name = 'AddCandidatePhoneAndAdminNotes1720000026000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('candidate_profiles', [
      new TableColumn({
        name: 'phone',
        type: 'varchar',
        length: '20',
        isNullable: true,
      }),
    ]);

    await queryRunner.addColumns('users', [
      new TableColumn({
        name: 'admin_notes',
        type: 'text',
        isNullable: true,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'admin_notes');
    await queryRunner.dropColumn('candidate_profiles', 'phone');
  }
}
