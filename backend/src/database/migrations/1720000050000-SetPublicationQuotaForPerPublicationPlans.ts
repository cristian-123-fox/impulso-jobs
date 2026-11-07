import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Los planes por publicación (Esencial, Básico, Premium…) incluyen **una
 * vacante** por compra. El campo `posting_quota` existía, pero los datos
 * quedaron en `NULL` y el alta de vacante no tenía cupo que consumir.
 *
 * El valor por defecto es 1. El administrador puede cambiarlo desde
 * `/admin/planes`; en la suscripción anual, `NULL` significa ilimitadas.
 *
 * Es una migración de datos: no toca el esquema y es idempotente (sólo llena
 * los nulos).
 */
export class SetPublicationQuotaForPerPublicationPlans1720000050000
  implements MigrationInterface
{
  name = 'SetPublicationQuotaForPerPublicationPlans1720000050000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const escape = (identifier: string): string =>
      queryRunner.connection.driver.escape(identifier);

    await queryRunner.query(
      `UPDATE ${escape('plans')} ` +
        `SET ${escape('posting_quota')} = 1 ` +
        `WHERE ${escape('plan_type')} = 'PER_PUBLICATION' ` +
        `AND ${escape('posting_quota')} IS NULL`,
    );
  }

  public async down(): Promise<void> {
    // No se revierte: quitar el cupo dejaría planes que no pueden publicar.
  }
}
