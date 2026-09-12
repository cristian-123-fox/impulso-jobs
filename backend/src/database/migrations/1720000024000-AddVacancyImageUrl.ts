import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * T24: imagen de referencia de la vacante. Portable a PostgreSQL/MySQL — los
 * identificadores entre comillas dobles sólo valen en PostgreSQL; MySQL/MariaDB
 * los lee como literales de cadena (ER_PARSE_ERROR 1064).
 */
export class AddVacancyImageUrl1720000024000 implements MigrationInterface {
  name = 'AddVacancyImageUrl1720000024000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'vacancies',
      new TableColumn({
        name: 'image_url',
        type: 'varchar',
        length: '500',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('vacancies', 'image_url');
  }
}
