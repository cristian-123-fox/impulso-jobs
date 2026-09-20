import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Ámbito del rol: a quién sirve. Hasta ahora `roles` era una lista plana en la
 * que convivían el personal de la plataforma, las cuentas de empresa y el
 * aspirante, así que `/admin/roles` no podía separarlos ni saber qué permisos
 * tenía sentido ofrecerle a cada uno.
 *
 * `varchar(20)` y no `enum`: el esquema tiene que valer igual en MySQL y en
 * PostgreSQL, y un `enum` nativo obliga a una migración de tipo para añadir un
 * valor. El default `PLATFORM` clasifica de golpe los roles personalizados que
 * ya existan — todos se crearon desde el back-office, que es personal de la
 * plataforma —, y a continuación se corrigen los dos roles de sistema que no
 * lo son.
 */
export class AddRoleScope1720000032000 implements MigrationInterface {
  name = 'AddRoleScope1720000032000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'roles',
      new TableColumn({
        name: 'scope',
        type: 'varchar',
        length: '20',
        isNullable: false,
        default: "'PLATFORM'",
      }),
    );

    const escape = (identifier: string): string =>
      queryRunner.connection.driver.escape(identifier);

    for (const [code, scope] of [
      ['EMPLOYER', 'COMPANY'],
      ['CANDIDATE', 'CANDIDATE'],
    ]) {
      // Parámetros portables: `$1`, `$2` en PostgreSQL y `?` en MySQL. El
      // contador se reinicia en **cada** consulta: uno compartido numeraría la
      // segunda como `$3`/`$4` y PostgreSQL no podría resolver `$1` (42P18).
      let index = 0;
      const param = (): string =>
        queryRunner.connection.driver.createParameter(`p${index}`, index++);

      await queryRunner.query(
        `UPDATE ${escape('roles')} SET ${escape('scope')} = ${param()} ` +
          `WHERE ${escape('code')} = ${param()}`,
        [scope, code],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('roles', 'scope');
  }
}
