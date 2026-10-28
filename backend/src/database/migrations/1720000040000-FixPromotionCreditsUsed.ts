import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixPromotionCreditsUsed1720000040000 implements MigrationInterface {
  name = 'FixPromotionCreditsUsed1720000040000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE company_subscriptions cs
      SET used_promotion_credits = COALESCE(
            (SELECT COUNT(*)::int
             FROM vacancy_promotions vp
             WHERE vp.company_id = cs.company_id
               AND vp.plan_id = cs.plan_id
               AND vp.price_paid = 0
               AND vp.status IN ('ACTIVE','EXPIRED','CANCELLED')),
            0
          )
    `);
    await queryRunner.query(`
      UPDATE company_subscriptions cs
      SET used_promotion_credits = LEAST(used_promotion_credits, promotion_credits)
    `);
  }

  public async down(): Promise<void> {
    // No-op.
  }
}
