import { MigrationInterface, QueryRunner } from 'typeorm';
import { upsertSeedRows } from './helpers/seed-data.helper';

/**
 * Versión 1.1.0 de los documentos legales que cambiaron para la entrega.
 *
 * Motivos del cambio (todos verificados contra el código y el negocio):
 *
 * - **PRIVACY:** el aviso decía que no había transferencias fuera de México,
 *   pero la pasarela de pago, el correo y el inicio de sesión con Google son
 *   encargados que pueden tratar datos fuera del país. También prometía
 *   descarga, baja y revocación «desde Mi cuenta», funciones que todavía no
 *   están expuestas en la interfaz; ahora remite al procedimiento por correo,
 *   que sí existe en el backend.
 * - **TERMS:** prometía CFDI por cada cobro y verificación de identidad
 *   documental. El PAC no está integrado y la plataforma valida formato y
 *   unicidad del documento, no autentica documentos oficiales. Se corrige la
 *   promesa y se deja la factura como «a solicitud».
 * - **REFUND:** decía que la cancelación desactivaba el acceso de inmediato,
 *   cuando el flujo real detiene la renovación y conserva el periodo pagado.
 *   También se aclara que el reembolso proporcional se solicita por correo.
 *
 * Las versiones 1.0.0 se conservan en la tabla para no perder la evidencia de
 * quién aceptó qué. Sólo se les quita `is_current`.
 *
 * ⚠️ El front debe llevar las mismas versiones y fechas en
 * `frontend/src/app/shared/catalogs/legal.catalogs.ts`. Si no coinciden, el
 * registro de consentimiento responde `LEGAL_DOCUMENT_VERSION_UNKNOWN`.
 */
export class BumpLegalVersionsForLaunch1720000041000
  implements MigrationInterface
{
  name = 'BumpLegalVersionsForLaunch1720000041000';

  private readonly effectiveDate = '2026-10-28';

  private readonly changedCodes = ['TERMS', 'PRIVACY', 'REFUND'];

  public async up(queryRunner: QueryRunner): Promise<void> {
    const escape = (identifier: string): string =>
      queryRunner.connection.driver.escape(identifier);
    const params = this.changedCodes
      .map((_, index) =>
        queryRunner.connection.driver.createParameter(`p${index}`, index),
      )
      .join(', ');

    await queryRunner.query(
      `UPDATE ${escape('legal_documents')} ` +
        `SET ${escape('is_current')} = ${this.falseLiteral(queryRunner)}, ` +
        `${escape('updated_at')} = CURRENT_TIMESTAMP ` +
        `WHERE ${escape('version')} = '1.0.0' ` +
        `AND ${escape('code')} IN (${params})`,
      this.changedCodes,
    );

    await upsertSeedRows(queryRunner, {
      table: 'legal_documents',
      matchBy: ['code', 'version'],
      rows: [
        {
          code: 'TERMS',
          version: '1.1.0',
          locale: 'es',
          title: 'Términos y condiciones',
          effective_date: this.effectiveDate,
          is_current: true,
          blocks_registration: true,
        },
        {
          code: 'PRIVACY',
          version: '1.1.0',
          locale: 'es',
          title: 'Aviso de privacidad',
          effective_date: this.effectiveDate,
          is_current: true,
          blocks_registration: true,
        },
        {
          code: 'REFUND',
          version: '1.1.0',
          locale: 'es',
          title: 'Política de reembolso',
          effective_date: this.effectiveDate,
          is_current: true,
          blocks_registration: false,
        },
      ],
      updateColumns: [
        'title',
        'effective_date',
        'is_current',
        'blocks_registration',
      ],
    });
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const escape = (identifier: string): string =>
      queryRunner.connection.driver.escape(identifier);
    const params = this.changedCodes
      .map((_, index) =>
        queryRunner.connection.driver.createParameter(`p${index}`, index),
      )
      .join(', ');

    await queryRunner.query(
      `DELETE FROM ${escape('legal_documents')} ` +
        `WHERE ${escape('version')} = '1.1.0' ` +
        `AND ${escape('code')} IN (${params})`,
      this.changedCodes,
    );

    await queryRunner.query(
      `UPDATE ${escape('legal_documents')} ` +
        `SET ${escape('is_current')} = ${this.trueLiteral(queryRunner)}, ` +
        `${escape('updated_at')} = CURRENT_TIMESTAMP ` +
        `WHERE ${escape('version')} = '1.0.0' ` +
        `AND ${escape('code')} IN (${params})`,
      this.changedCodes,
    );
  }

  /** Literales portables: MySQL usa 0/1 y PostgreSQL acepta false/true. */
  private falseLiteral(queryRunner: QueryRunner): string {
    return queryRunner.connection.options.type === 'mysql' ? '0' : 'false';
  }

  private trueLiteral(queryRunner: QueryRunner): string {
    return queryRunner.connection.options.type === 'mysql' ? '1' : 'true';
  }
}
