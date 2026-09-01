import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from 'typeorm';

/**
 * T15: perfil de la posición — área profesional (catálogo embebido), número de
 * plazas, tipo de contrato LFT, escolaridad mínima, comisiones y fecha límite
 * de postulación. Portable a PostgreSQL/MySQL.
 */
export class EnrichVacancyModel1720000016000 implements MigrationInterface {
  name = 'EnrichVacancyModel1720000016000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'vacancies',
      new TableColumn({
        name: 'professional_area_id',
        type: 'smallint',
        isNullable: true,
      }),
    );
    await queryRunner.addColumn(
      'vacancies',
      new TableColumn({
        name: 'positions_count',
        type: 'smallint',
        default: 1,
      }),
    );
    await queryRunner.addColumn(
      'vacancies',
      new TableColumn({
        name: 'contract_type',
        type: 'varchar',
        length: '20',
        isNullable: true,
      }),
    );
    await queryRunner.addColumn(
      'vacancies',
      new TableColumn({
        name: 'min_education_level',
        type: 'varchar',
        length: '20',
        isNullable: true,
      }),
    );
    await queryRunner.addColumn(
      'vacancies',
      new TableColumn({
        name: 'has_commissions',
        type: 'boolean',
        default: false,
      }),
    );
    await queryRunner.addColumn(
      'vacancies',
      new TableColumn({
        name: 'application_deadline',
        type: 'date',
        isNullable: true,
      }),
    );
    await queryRunner.createIndex(
      'vacancies',
      new TableIndex({
        name: 'idx_vacancies_professional_area',
        columnNames: ['professional_area_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('vacancies', 'idx_vacancies_professional_area');
    await queryRunner.dropColumn('vacancies', 'application_deadline');
    await queryRunner.dropColumn('vacancies', 'has_commissions');
    await queryRunner.dropColumn('vacancies', 'min_education_level');
    await queryRunner.dropColumn('vacancies', 'contract_type');
    await queryRunner.dropColumn('vacancies', 'positions_count');
    await queryRunner.dropColumn('vacancies', 'professional_area_id');
  }
}
