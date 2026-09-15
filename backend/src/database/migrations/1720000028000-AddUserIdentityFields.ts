import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Identidad de la persona en `users`. Hasta ahora el nombre para mostrar se
 * derivaba del perfil (`candidate_profiles`) o de la empresa
 * (`companies.business_name`), así que una cuenta ADMIN no tenía **dónde**
 * guardar un nombre: el back-office podía editarlo todo menos quién era.
 *
 * Son nullable a propósito: las cuentas que ya existen no tienen estos datos
 * y no hay de dónde inventarlos. Para candidatos y empresas su perfil sigue
 * mandando sobre el nombre para mostrar; esto es el respaldo.
 */
export class AddUserIdentityFields1720000028000 implements MigrationInterface {
  name = 'AddUserIdentityFields1720000028000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('users', [
      new TableColumn({
        name: 'first_name',
        type: 'varchar',
        length: '80',
        isNullable: true,
      }),
      new TableColumn({
        name: 'last_name',
        type: 'varchar',
        length: '80',
        isNullable: true,
      }),
      new TableColumn({
        name: 'phone',
        type: 'varchar',
        length: '20',
        isNullable: true,
      }),
      // `job_title` y no `position`: POSITION es palabra reservada del
      // estándar SQL (función) y este esquema tiene que valer en MySQL y en
      // PostgreSQL. No merece la pena depender de que el driver la escape.
      new TableColumn({
        name: 'job_title',
        type: 'varchar',
        length: '120',
        isNullable: true,
      }),
      new TableColumn({
        name: 'photo_url',
        type: 'varchar',
        length: '500',
        isNullable: true,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'photo_url');
    await queryRunner.dropColumn('users', 'job_title');
    await queryRunner.dropColumn('users', 'phone');
    await queryRunner.dropColumn('users', 'last_name');
    await queryRunner.dropColumn('users', 'first_name');
  }
}
