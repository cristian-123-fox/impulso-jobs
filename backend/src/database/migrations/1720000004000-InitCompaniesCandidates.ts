import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

/**
 * M5: dominios de empresas y candidatos. `companies` + `company_users` (membresía
 * con OWNER) y `candidate_profiles` (1:1 con users). Portable a PostgreSQL/MySQL.
 */
export class InitCompaniesCandidates1720000004000 implements MigrationInterface {
  name = 'InitCompaniesCandidates1720000004000';

  private timestamps() {
    return [
      {
        name: 'created_at',
        type: 'timestamp',
        isNullable: false,
        default: 'CURRENT_TIMESTAMP',
      },
      {
        name: 'updated_at',
        type: 'timestamp',
        isNullable: false,
        default: 'CURRENT_TIMESTAMP',
      },
      { name: 'deleted_at', type: 'timestamp', isNullable: true },
    ];
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    // companies
    await queryRunner.createTable(
      new Table({
        name: 'companies',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'business_name', type: 'varchar', length: '160' },
          { name: 'legal_name', type: 'varchar', length: '160' },
          { name: 'rfc', type: 'varchar', length: '13' },
          { name: 'tax_regime', type: 'varchar', length: '4' },
          { name: 'postal_code', type: 'varchar', length: '5' },
          {
            name: 'economic_sector',
            type: 'varchar',
            length: '120',
            isNullable: true,
          },
          { name: 'website', type: 'varchar', length: '255', isNullable: true },
          {
            name: 'country',
            type: 'varchar',
            length: '60',
            default: "'MX'",
          },
          { name: 'state', type: 'varchar', length: '10' },
          { name: 'municipality', type: 'varchar', length: '120' },
          ...this.timestamps(),
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'companies',
      new TableIndex({
        name: 'uq_companies_rfc',
        columnNames: ['rfc'],
        isUnique: true,
      }),
    );

    // company_users
    await queryRunner.createTable(
      new Table({
        name: 'company_users',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'company_id', type: 'varchar', length: '36' },
          { name: 'user_id', type: 'varchar', length: '36' },
          {
            name: 'role',
            type: 'varchar',
            length: '20',
            default: "'OWNER'",
          },
          ...this.timestamps(),
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'company_users',
      new TableIndex({
        name: 'uq_company_users_company_user',
        columnNames: ['company_id', 'user_id'],
        isUnique: true,
      }),
    );
    await queryRunner.createIndex(
      'company_users',
      new TableIndex({
        name: 'idx_company_users_user_id',
        columnNames: ['user_id'],
      }),
    );
    await queryRunner.createForeignKey(
      'company_users',
      new TableForeignKey({
        name: 'fk_company_users_company',
        columnNames: ['company_id'],
        referencedTableName: 'companies',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
    await queryRunner.createForeignKey(
      'company_users',
      new TableForeignKey({
        name: 'fk_company_users_user',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // candidate_profiles
    await queryRunner.createTable(
      new Table({
        name: 'candidate_profiles',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'user_id', type: 'varchar', length: '36' },
          { name: 'first_name', type: 'varchar', length: '80' },
          { name: 'last_name', type: 'varchar', length: '80' },
          { name: 'document_type', type: 'varchar', length: '20' },
          { name: 'document_number', type: 'varchar', length: '40' },
          { name: 'curp', type: 'varchar', length: '18', isNullable: true },
          { name: 'birth_date', type: 'date' },
          {
            name: 'professional_title',
            type: 'varchar',
            length: '120',
            isNullable: true,
          },
          {
            name: 'country',
            type: 'varchar',
            length: '60',
            default: "'MX'",
          },
          { name: 'state', type: 'varchar', length: '10' },
          { name: 'municipality', type: 'varchar', length: '120' },
          ...this.timestamps(),
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'candidate_profiles',
      new TableIndex({
        name: 'uq_candidate_profiles_user_id',
        columnNames: ['user_id'],
        isUnique: true,
      }),
    );
    await queryRunner.createIndex(
      'candidate_profiles',
      new TableIndex({
        name: 'uq_candidate_profiles_document_number',
        columnNames: ['document_number'],
        isUnique: true,
      }),
    );
    await queryRunner.createForeignKey(
      'candidate_profiles',
      new TableForeignKey({
        name: 'fk_candidate_profiles_user',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('candidate_profiles', true);
    await queryRunner.dropTable('company_users', true);
    await queryRunner.dropTable('companies', true);
  }
}
