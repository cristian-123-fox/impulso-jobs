import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableIndex,
} from 'typeorm';

/**
 * M14: monetización. Catálogo de planes y beneficios, promociones por vacante,
 * suscripciones de empresa, órdenes de cobro e idempotencia de eventos.
 *
 * Los **planes no se siembran**: los precios en MXN y el alcance de la Anual
 * son decisiones de negocio abiertas, así que un administrador los da de alta
 * desde `/admin/plans`. `pnpm seed:plan-features` sí crea el catálogo de
 * beneficios, cuyos códigos sí están definidos.
 */
export class InitBilling1720000012000 implements MigrationInterface {
  name = 'InitBilling1720000012000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const timestamps = [
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

    await queryRunner.createTable(
      new Table({
        name: 'plans',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'code', type: 'varchar', length: '40' },
          { name: 'name', type: 'varchar', length: '80' },
          {
            name: 'description',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          { name: 'plan_type', type: 'varchar', length: '30' },
          {
            name: 'base_price',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0,
          },
          { name: 'currency', type: 'varchar', length: '3', default: "'MXN'" },
          {
            name: 'tax_rate',
            type: 'decimal',
            precision: 5,
            scale: 4,
            default: 0.16,
          },
          { name: 'validity_days', type: 'int', isNullable: true },
          { name: 'billing_period', type: 'varchar', length: '20' },
          { name: 'posting_quota', type: 'int', isNullable: true },
          { name: 'is_popular', type: 'boolean', default: false },
          { name: 'is_active', type: 'boolean', default: false },
          { name: 'sort_order', type: 'smallint', default: 0 },
          {
            name: 'provider_product_id',
            type: 'varchar',
            length: '120',
            isNullable: true,
          },
          {
            name: 'provider_price_id',
            type: 'varchar',
            length: '120',
            isNullable: true,
          },
          ...timestamps,
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'plans',
      new TableIndex({
        name: 'uq_plans_code',
        columnNames: ['code'],
        isUnique: true,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'plan_features',
        columns: [
          { name: 'code', type: 'varchar', length: '60', isPrimary: true },
          { name: 'name', type: 'varchar', length: '120' },
          {
            name: 'description',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          { name: 'value_type', type: 'varchar', length: '20' },
          { name: 'sort_order', type: 'smallint', default: 0 },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'plan_features',
      new TableIndex({
        name: 'idx_plan_features_sort_order',
        columnNames: ['sort_order'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'plan_feature_values',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'plan_id', type: 'varchar', length: '36' },
          { name: 'feature_code', type: 'varchar', length: '60' },
          { name: 'is_included', type: 'boolean', default: false },
          { name: 'value', type: 'varchar', length: '120', isNullable: true },
          ...timestamps,
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'plan_feature_values',
      new TableIndex({
        name: 'uq_plan_feature_values_plan_feature',
        columnNames: ['plan_id', 'feature_code'],
        isUnique: true,
      }),
    );
    await queryRunner.createIndex(
      'plan_feature_values',
      new TableIndex({
        name: 'idx_plan_feature_values_plan_id',
        columnNames: ['plan_id'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'vacancy_promotions',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'vacancy_id', type: 'varchar', length: '36' },
          { name: 'plan_id', type: 'varchar', length: '36' },
          { name: 'company_id', type: 'varchar', length: '36' },
          { name: 'purchased_by', type: 'varchar', length: '36' },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'PENDING_PAYMENT'",
          },
          {
            name: 'price_paid',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0,
          },
          { name: 'currency', type: 'varchar', length: '3', default: "'MXN'" },
          { name: 'starts_at', type: 'timestamp', isNullable: true },
          { name: 'ends_at', type: 'timestamp', isNullable: true },
          ...timestamps,
        ],
      }),
      true,
    );
    for (const [name, columns] of [
      ['idx_vacancy_promotions_vacancy_id', ['vacancy_id']],
      ['idx_vacancy_promotions_company_id', ['company_id']],
      ['idx_vacancy_promotions_status', ['status']],
      ['idx_vacancy_promotions_ends_at', ['ends_at']],
    ] as [string, string[]][]) {
      await queryRunner.createIndex(
        'vacancy_promotions',
        new TableIndex({ name, columnNames: columns }),
      );
    }

    await queryRunner.createTable(
      new Table({
        name: 'company_subscriptions',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'company_id', type: 'varchar', length: '36' },
          { name: 'plan_id', type: 'varchar', length: '36' },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'PENDING_PAYMENT'",
          },
          {
            name: 'provider_subscription_id',
            type: 'varchar',
            length: '120',
            isNullable: true,
          },
          { name: 'starts_at', type: 'timestamp', isNullable: true },
          { name: 'current_period_end', type: 'timestamp', isNullable: true },
          { name: 'auto_renew', type: 'boolean', default: true },
          ...timestamps,
        ],
      }),
      true,
    );
    for (const [name, columns] of [
      ['idx_company_subscriptions_company_id', ['company_id']],
      ['idx_company_subscriptions_status', ['status']],
      ['idx_company_subscriptions_period_end', ['current_period_end']],
    ] as [string, string[]][]) {
      await queryRunner.createIndex(
        'company_subscriptions',
        new TableIndex({ name, columnNames: columns }),
      );
    }

    await queryRunner.createTable(
      new Table({
        name: 'promotion_orders',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          {
            name: 'promotion_id',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'subscription_id',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          { name: 'company_id', type: 'varchar', length: '36' },
          { name: 'provider', type: 'varchar', length: '30' },
          { name: 'payment_method', type: 'varchar', length: '20' },
          {
            name: 'payment_status',
            type: 'varchar',
            length: '20',
            default: "'PENDING'",
          },
          { name: 'subtotal', type: 'decimal', precision: 12, scale: 2 },
          { name: 'tax_amount', type: 'decimal', precision: 12, scale: 2 },
          { name: 'total', type: 'decimal', precision: 12, scale: 2 },
          { name: 'currency', type: 'varchar', length: '3', default: "'MXN'" },
          {
            name: 'external_reference',
            type: 'varchar',
            length: '160',
            isNullable: true,
          },
          {
            name: 'voucher_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'voucher_reference',
            type: 'varchar',
            length: '120',
            isNullable: true,
          },
          { name: 'voucher_expires_at', type: 'timestamp', isNullable: true },
          { name: 'installments', type: 'int', default: 1 },
          {
            name: 'cfdi_uuid',
            type: 'varchar',
            length: '60',
            isNullable: true,
          },
          { name: 'paid_at', type: 'timestamp', isNullable: true },
          ...timestamps,
        ],
      }),
      true,
    );
    for (const [name, columns] of [
      ['idx_promotion_orders_promotion_id', ['promotion_id']],
      ['idx_promotion_orders_subscription_id', ['subscription_id']],
      ['idx_promotion_orders_company_id', ['company_id']],
      ['idx_promotion_orders_payment_status', ['payment_status']],
      ['idx_promotion_orders_external_reference', ['external_reference']],
    ] as [string, string[]][]) {
      await queryRunner.createIndex(
        'promotion_orders',
        new TableIndex({ name, columnNames: columns }),
      );
    }

    // Idempotencia de los webhooks: PK compuesta (proveedor + evento).
    await queryRunner.createTable(
      new Table({
        name: 'processed_payment_events',
        columns: [
          { name: 'provider', type: 'varchar', length: '30', isPrimary: true },
          { name: 'event_id', type: 'varchar', length: '160', isPrimary: true },
          { name: 'type', type: 'varchar', length: '80' },
          { name: 'processed_at', type: 'timestamp' },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'processed_payment_events',
      new TableIndex({
        name: 'idx_processed_payment_events_processed_at',
        columnNames: ['processed_at'],
      }),
    );

    // Cliente en la pasarela. En el ER es `stripe_customer_id`; agnóstico aquí
    // porque el cobro pasa por `PaymentProviderPort`.
    await queryRunner.addColumn(
      'companies',
      new TableColumn({
        name: 'payment_customer_id',
        type: 'varchar',
        length: '120',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('companies', 'payment_customer_id');
    await queryRunner.dropTable('processed_payment_events', true);
    await queryRunner.dropTable('promotion_orders', true);
    await queryRunner.dropTable('company_subscriptions', true);
    await queryRunner.dropTable('vacancy_promotions', true);
    await queryRunner.dropTable('plan_feature_values', true);
    await queryRunner.dropTable('plan_features', true);
    await queryRunner.dropTable('plans', true);
  }
}
