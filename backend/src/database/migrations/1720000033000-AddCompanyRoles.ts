import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from 'typeorm';

/**
 * Roles propios de una empresa.
 *
 * Hasta ahora todo miembro de una empresa tenía el rol EMPLOYER completo: el
 * rol interno (OWNER/ADMIN/RECRUITER/MEMBER) sólo decidía quién gestionaba el
 * equipo, así que un reclutador podía contratar planes o editar la ficha
 * fiscal igual que el propietario. Con esta columna el propietario o un
 * administrador define perfiles de permisos para su equipo.
 *
 * `company_id` nulo = rol de plataforma (los de siempre, los de `/admin/roles`);
 * informado = rol que pertenece a esa empresa y sólo ella ve y asigna.
 * `varchar(36)` como todos los ids del esquema; sin FK, igual que el resto de
 * relaciones, para que el esquema valga igual en MySQL y PostgreSQL.
 */
export class AddCompanyRoles1720000033000 implements MigrationInterface {
  name = 'AddCompanyRoles1720000033000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'roles',
      new TableColumn({
        name: 'company_id',
        type: 'varchar',
        length: '36',
        isNullable: true,
      }),
    );
    await queryRunner.createIndex(
      'roles',
      new TableIndex({
        name: 'idx_roles_company_id',
        columnNames: ['company_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('roles', 'idx_roles_company_id');
    await queryRunner.dropColumn('roles', 'company_id');
  }
}
