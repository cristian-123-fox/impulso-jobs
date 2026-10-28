import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPromotionCreditsToSubscriptions1720000038000 implements MigrationInterface {
  name = 'AddPromotionCreditsToSubscriptions1720000038000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'company_subscriptions',
      new TableColumn({
        name: 'promotion_credits',
        type: 'int',
        default: 0,
      }),
    );
    await queryRunner.addColumn(
      'company_subscriptions',
      new TableColumn({
        name: 'used_promotion_credits',
        type: 'int',
        default: 0,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('company_subscriptions', 'used_promotion_credits');
    await queryRunner.dropColumn('company_subscriptions', 'promotion_credits');
  }
}
