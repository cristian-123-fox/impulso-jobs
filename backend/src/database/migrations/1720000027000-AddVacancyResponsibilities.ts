import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * T32: responsabilidades del puesto, el tercer campo largo de la vacante junto
 * a `description` y `requirements`.
 *
 * Nace **nullable** a propósito: las vacantes ya publicadas no tienen el dato y
 * exigirlo las dejaría inválidas. El detalle público oculta la sección cuando
 * viene vacía — que es justo lo que hacía falta, porque hasta ahora ese título
 * pintaba la descripción por segunda vez.
 *
 * Portable a PostgreSQL/MySQL: `text` existe en ambos y los identificadores van
 * sin comillas (las dobles sólo valen en PostgreSQL; MySQL las lee como
 * literales de cadena y revienta con ER_PARSE_ERROR 1064).
 */
export class AddVacancyResponsibilities1720000027000 implements MigrationInterface {
  name = 'AddVacancyResponsibilities1720000027000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'vacancies',
      new TableColumn({
        name: 'responsibilities',
        type: 'text',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('vacancies', 'responsibilities');
  }
}
