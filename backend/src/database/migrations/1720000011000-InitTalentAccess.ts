import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * M12: cupo de visitas a la base de talento y registro de CV desbloqueados.
 *
 * La búsqueda en sí no necesita tablas nuevas: consulta `candidate_profiles` y
 * sus subrecursos. Estas dos tablas son sólo el control del cupo.
 *
 * `talent_access_grants` los **crea M14** al activar un plan; hasta entonces no
 * habrá filas y la base de talento quedará bloqueada, que es el comportamiento
 * correcto para una empresa sin plan contratado.
 */
export class InitTalentAccess1720000011000 implements MigrationInterface {
  name = 'InitTalentAccess1720000011000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'talent_access_grants',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'company_id', type: 'varchar', length: '36' },
          { name: 'source_type', type: 'varchar', length: '20' },
          {
            name: 'source_id',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          // -1 = ilimitado.
          { name: 'total_visits', type: 'int' },
          { name: 'used_visits', type: 'int', default: 0 },
          { name: 'expires_at', type: 'timestamp', isNullable: true },
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
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'talent_access_grants',
      new TableIndex({
        name: 'idx_talent_access_grants_company_id',
        columnNames: ['company_id'],
      }),
    );
    await queryRunner.createIndex(
      'talent_access_grants',
      new TableIndex({
        name: 'idx_talent_access_grants_expires_at',
        columnNames: ['company_id', 'expires_at'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'talent_access_views',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'company_id', type: 'varchar', length: '36' },
          { name: 'candidate_profile_id', type: 'varchar', length: '36' },
          { name: 'grant_id', type: 'varchar', length: '36' },
          { name: 'viewed_at', type: 'timestamp' },
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
        ],
      }),
      true,
    );

    // Una empresa paga una sola vez por cada CV: la unicidad es la que hace
    // idempotente el consumo del cupo.
    await queryRunner.createIndex(
      'talent_access_views',
      new TableIndex({
        name: 'uq_talent_access_views_company_candidate',
        columnNames: ['company_id', 'candidate_profile_id'],
        isUnique: true,
      }),
    );
    await queryRunner.createIndex(
      'talent_access_views',
      new TableIndex({
        name: 'idx_talent_access_views_company_id',
        columnNames: ['company_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('talent_access_views', true);
    await queryRunner.dropTable('talent_access_grants', true);
  }
}
