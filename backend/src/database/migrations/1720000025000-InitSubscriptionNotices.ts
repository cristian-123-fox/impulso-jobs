import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * T22: acuses de los avisos de vencimiento de suscripción. Portable a
 * PostgreSQL/MySQL.
 *
 * El índice único `(subscription_id, period_end, threshold_days)` es la
 * idempotencia del job diario: sin él, el cron reenviaría el mismo aviso cada
 * día mientras la suscripción siguiera dentro del umbral. `period_end` entra
 * en la clave para que una renovación pueda volver a avisar.
 */
export class InitSubscriptionNotices1720000023000 implements MigrationInterface {
  name = 'InitSubscriptionNotices1720000023000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'subscription_notices',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'subscription_id', type: 'varchar', length: '36' },
          { name: 'company_id', type: 'varchar', length: '36' },
          { name: 'threshold_days', type: 'int' },
          { name: 'period_end', type: 'timestamp' },
          { name: 'sent_at', type: 'timestamp' },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          { name: 'deleted_at', type: 'timestamp', isNullable: true },
        ],
      }),
      true,
    );

    const indexes: [string, string[], boolean][] = [
      ['idx_subscription_notices_subscription_id', ['subscription_id'], false],
      [
        'uq_subscription_notices_sub_period_threshold',
        ['subscription_id', 'period_end', 'threshold_days'],
        true,
      ],
    ];
    for (const [name, columnNames, isUnique] of indexes) {
      await queryRunner.createIndex(
        'subscription_notices',
        new TableIndex({ name, columnNames, isUnique }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('subscription_notices', true);
  }
}
