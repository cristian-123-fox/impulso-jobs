import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

/**
 * Origen del cupo de una promoción.
 *
 * `vacancy_promotions` ya guardaba empresa, vacante, plan, fechas y estado. Lo
 * que faltaba era saber **de qué suscripción salió el crédito** cuando la
 * promoción se activó con un cupo del plan. Así una promoción tiene un origen
 * verificable y no hay que inferirlo de `price_paid = 0`.
 *
 * Las promociones compradas con pago puntual quedan con `subscription_id` NULL:
 * su origen es la orden de pago, que ya vive en `promotion_orders`.
 *
 * Migración no destructiva: sólo añade una columna nullable y su índice.
 */
export class AddPromotionSubscriptionOrigin1720000043000
  implements MigrationInterface
{
  name = 'AddPromotionSubscriptionOrigin1720000043000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('vacancy_promotions', 'subscription_id'))) {
      await queryRunner.addColumn(
        'vacancy_promotions',
        new TableColumn({
          name: 'subscription_id',
          type: 'varchar',
          length: '36',
          isNullable: true,
        }),
      );
    }

    const indices = await queryRunner.getTable('vacancy_promotions');
    if (
      indices &&
      !indices.indices.some(
        (index) => index.name === 'idx_vacancy_promotions_subscription_id',
      )
    ) {
      await queryRunner.createIndex(
        'vacancy_promotions',
        new TableIndex({
          name: 'idx_vacancy_promotions_subscription_id',
          columnNames: ['subscription_id'],
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('vacancy_promotions');
    const index = table?.indices.find(
      (item) => item.name === 'idx_vacancy_promotions_subscription_id',
    );
    if (index) {
      await queryRunner.dropIndex('vacancy_promotions', index);
    }
    if (await queryRunner.hasColumn('vacancy_promotions', 'subscription_id')) {
      await queryRunner.dropColumn('vacancy_promotions', 'subscription_id');
    }
  }
}
