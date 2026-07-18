import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class ExtendCompanyProfile1720000008000 implements MigrationInterface {
  name = 'ExtendCompanyProfile1720000008000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('companies', [
      new TableColumn({
        name: 'cfdi_use',
        type: 'varchar',
        length: '4',
        isNullable: true,
      }),
      new TableColumn({
        name: 'company_type',
        type: 'varchar',
        length: '30',
        isNullable: true,
      }),
      new TableColumn({
        name: 'corporate_email',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
      new TableColumn({
        name: 'phone_number',
        type: 'varchar',
        length: '20',
        isNullable: true,
      }),
      new TableColumn({
        name: 'address',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
      new TableColumn({
        name: 'company_description',
        type: 'text',
        isNullable: true,
      }),
      new TableColumn({
        name: 'employee_count',
        type: 'int',
        isNullable: true,
      }),
      new TableColumn({
        name: 'foundation_year',
        type: 'int',
        isNullable: true,
      }),
      new TableColumn({
        name: 'logo_url',
        type: 'varchar',
        length: '500',
        isNullable: true,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns('companies', [
      'cfdi_use',
      'company_type',
      'corporate_email',
      'phone_number',
      'address',
      'company_description',
      'employee_count',
      'foundation_year',
      'logo_url',
    ]);
  }
}
