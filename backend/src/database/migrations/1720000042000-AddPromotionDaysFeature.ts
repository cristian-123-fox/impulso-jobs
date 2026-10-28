import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  deleteSeedRows,
  upsertSeedRows,
} from './helpers/seed-data.helper';

/**
 * Separa la **duración de la promoción** de la duración de publicación.
 *
 * Hasta ahora `publication_days` hacía las dos cosas: decidía cuántos días
 * seguía publicada la vacante y cuántos duraba el distintivo pagado. Eso hacía
 * imposible tener un plan de 30 días de publicación con una promoción de 7.
 *
 * Se añade el beneficio `promotion_days` (NUMERIC). Si un plan no lo define,
 * `EntitlementService` cae a `publication_days` y luego a `validity_days`, así
 * que ningún plan existente se rompe.
 *
 * Valores iniciales confirmados por el negocio:
 *   Básico  → 7 días
 *   Premium → 15 días
 *   Anual   → 30 días
 *
 * Sólo se tocan esos códigos. Los precios, la periodicidad y los cupos de
 * publicación no se modifican.
 */
export class AddPromotionDaysFeature1720000042000
  implements MigrationInterface
{
  name = 'AddPromotionDaysFeature1720000042000';

  private readonly durations: Readonly<Record<string, number>> = {
    BASICO: 7,
    ESENCIAL: 7,
    PREMIUM: 15,
    EMPRESA_ANUAL: 30,
    ANUAL: 30,
  };

  /**
   * Cupos iniciales confirmados por el negocio. Se siembran sólo si el plan no
   * los tenía; si ya existían, se respeta lo que haya configurado el admin.
   */
  private readonly credits: Readonly<Record<string, number>> = {
    BASICO: 1,
    ESENCIAL: 1,
    PREMIUM: 4,
    EMPRESA_ANUAL: 12,
    ANUAL: 12,
  };

  public async up(queryRunner: QueryRunner): Promise<void> {
    // `plan_features` no tiene `id` ni timestamps (su PK es `code`), así que no
    // se puede usar `upsertSeedRows`: ese helper siempre busca por `id`.
    const exists = (await queryRunner.query(
      `SELECT ${this.escape(queryRunner, 'code')} FROM ` +
        `${this.escape(queryRunner, 'plan_features')} ` +
        `WHERE ${this.escape(queryRunner, 'code')} = ` +
        `${queryRunner.connection.driver.createParameter('f0', 0)} LIMIT 1`,
      ['promotion_days'],
    )) as Array<{ code: string }>;

    if (exists.length === 0) {
      const param = (index: number): string =>
        queryRunner.connection.driver.createParameter(`f${index}`, index);
      await queryRunner.query(
        `INSERT INTO ${this.escape(queryRunner, 'plan_features')} ` +
          `(${this.escape(queryRunner, 'code')}, ` +
          `${this.escape(queryRunner, 'name')}, ` +
          `${this.escape(queryRunner, 'description')}, ` +
          `${this.escape(queryRunner, 'value_type')}, ` +
          `${this.escape(queryRunner, 'sort_order')}) ` +
          `VALUES (${param(0)}, ${param(1)}, ${param(2)}, ${param(3)}, ${param(4)})`,
        [
          'promotion_days',
          'Duración de la promoción (días)',
          'Días que dura el distintivo pagado sobre la vacante. Si falta, se usa publication_days.',
          'NUMERIC',
          30,
        ],
      );
    }

    const plans = (await queryRunner.query(
      `SELECT ${this.escape(queryRunner, 'id')} AS id, ` +
        `${this.escape(queryRunner, 'code')} AS code, ` +
        `${this.escape(queryRunner, 'name')} AS name ` +
        `FROM ${this.escape(queryRunner, 'plans')}`,
    )) as Array<{ id: string; code: string; name: string }>;

    for (const plan of plans) {
      const key = plan.code?.toUpperCase?.() ?? '';
      const days =
        this.durations[key] ?? this.durations[this.normalize(plan.name)] ?? null;
      const included =
        this.credits[key] ?? this.credits[this.normalize(plan.name)] ?? null;
      if (days === null && included === null) continue;

      if (days !== null) {
        await upsertSeedRows(queryRunner, {
          table: 'plan_feature_values',
          matchBy: ['plan_id', 'feature_code'],
          rows: [
            {
              plan_id: plan.id,
              feature_code: 'promotion_days',
              is_included: true,
              value: String(days),
            },
          ],
          updateColumns: ['is_included', 'value'],
        });
      }

      if (included !== null) {
        await upsertSeedRows(queryRunner, {
          table: 'plan_feature_values',
          matchBy: ['plan_id', 'feature_code'],
          rows: [
            {
              plan_id: plan.id,
              feature_code: 'promoted_vacancies',
              is_included: true,
              value: String(included),
            },
          ],
          updateColumns: ['is_included', 'value'],
        });
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await deleteSeedRows(queryRunner, {
      table: 'plan_feature_values',
      column: 'feature_code',
      values: ['promotion_days'],
    });
    await deleteSeedRows(queryRunner, {
      table: 'plan_features',
      column: 'code',
      values: ['promotion_days'],
    });
  }

  private escape(queryRunner: QueryRunner, identifier: string): string {
    return queryRunner.connection.driver.escape(identifier);
  }

  /** "Básico" → "BASICO"; el nombre viene sin acento en la mayoría de casos. */
  private normalize(value: string | null | undefined): string {
    return (value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .trim();
  }
}
