import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/** M4: contadores de reenvío para la verificación de correo. */
export class AddEmailVerification1720000003000 implements MigrationInterface {
  name = 'AddEmailVerification1720000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('users', [
      new TableColumn({
        name: 'email_verification_attempts',
        type: 'int',
        isNullable: false,
        default: 0,
      }),
      new TableColumn({
        name: 'email_verification_window_start',
        type: 'timestamp',
        isNullable: true,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns('users', [
      'email_verification_attempts',
      'email_verification_window_start',
    ]);
  }
}
