import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillPromotionCredits1720000039000 implements MigrationInterface {
  name = 'BackfillPromotionCredits1720000039000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE company_subscriptions cs
      SET promotion_credits = COALESCE(
            (SELECT CAST(pfv.value AS INTEGER)
             FROM plan_feature_values pfv
             WHERE pfv.plan_id = cs.plan_id
               AND pfv.feature_code = 'promoted_vacancies'
               AND pfv.is_included = TRUE),
            0
          ),
          used_promotion_credits = LEAST(
            COALESCE(
              (SELECT COUNT(*)::int
               FROM vacancy_promotions vp
               WHERE vp.company_id = cs.company_id),
              0
            ),
            COALESCE(
              (SELECT CAST(pfv.value AS INTEGER)
               FROM plan_feature_values pfv
               WHERE pfv.plan_id = cs.plan_id
                 AND pfv.feature_code = 'promoted_vacancies'
                 AND pfv.is_included = TRUE),
              0
            )
          )
    `);
  }

  public async down(): Promise<void> {
    // No-op: no se puede reconstruir el estado anterior con certeza.
  }
}
