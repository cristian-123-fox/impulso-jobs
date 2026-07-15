import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/** M3: columnas de recuperación de contraseña e invalidación de sesiones. */
export class AddPasswordReset1720000002000 implements MigrationInterface {
  name = 'AddPasswordReset1720000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('users', [
      new TableColumn({
        name: 'tokens_valid_from',
        type: 'timestamp',
        isNullable: true,
      }),
      new TableColumn({
        name: 'password_reset_attempts',
        type: 'int',
        isNullable: false,
        default: 0,
      }),
      new TableColumn({
        name: 'password_reset_window_start',
        type: 'timestamp',
        isNullable: true,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns('users', [
      'tokens_valid_from',
      'password_reset_attempts',
      'password_reset_window_start',
    ]);
  }
}
