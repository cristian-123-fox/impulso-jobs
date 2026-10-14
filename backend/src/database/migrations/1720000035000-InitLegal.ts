import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';
import { upsertSeedRows } from './helpers/seed-data.helper';

/**
 * Módulo legal: catálogo de documentos versionados (`legal_documents`) y
 * bitácora de consentimientos (`legal_consents`).
 *
 * ## Por qué existe
 *
 * La LFPDPPP vigente (la del DOF 20-03-2025, que abrogó la de 2010) obliga a
 * que el tratamiento de datos personales esté sujeto al consentimiento del
 * titular (art. 7) y a que el aviso de privacidad contenga seis elementos
 * concretos (art. 15). Eso obliga a poder **demostrar** qué documento, en qué
 * versión y a qué hora vio y aceptó cada persona: si el texto se actualiza sin
 * dejar rastro, la evidencia de hace un año apunta a algo que ya no existe.
 *
 * Por eso hay dos tablas y no una: `legal_documents` es el catálogo de
 * versiones (lo que el cliente contrasta antes de aceptar, para no guardar una
 * aceptación sobre un texto desconocido) y `legal_consents` es el historial
 * append-only de lo que cada titular aceptó o rechazó.
 *
 * ## Portabilidad
 *
 * Sin `enum`, sin `json` con DEFAULT, sin identificadores entrecomillados a
 * mano y sin índices únicos declarados en la entidad que el runner pueda
 * reordenar: el esquema tiene que correr igual en PostgreSQL y MySQL.
 */
export class InitLegal1720000035000 implements MigrationInterface {
  name = 'InitLegal1720000035000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.createDocuments(queryRunner);
    await this.createConsents(queryRunner);
    await this.seedCurrentVersions(queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('legal_consents', true);
    await queryRunner.dropTable('legal_documents', true);
  }

  private async createDocuments(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('legal_documents')) return;

    await queryRunner.createTable(
      new Table({
        name: 'legal_documents',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'code', type: 'varchar', length: '40' },
          { name: 'version', type: 'varchar', length: '20' },
          { name: 'locale', type: 'varchar', length: '5', default: "'es'" },
          { name: 'title', type: 'varchar', length: '160' },
          { name: 'effective_date', type: 'date' },
          {
            name: 'content_hash',
            type: 'varchar',
            length: '64',
            isNullable: true,
          },
          { name: 'is_current', type: 'boolean', default: false },
          { name: 'blocks_registration', type: 'boolean', default: true },
          { name: 'created_at', type: 'timestamp' },
          { name: 'updated_at', type: 'timestamp' },
          { name: 'deleted_at', type: 'timestamp', isNullable: true },
        ],
      }),
      true,
    );

    await queryRunner.createIndices('legal_documents', [
      new TableIndex({
        name: 'uq_legal_documents_code_version',
        columnNames: ['code', 'version'],
        isUnique: true,
      }),
      new TableIndex({
        name: 'idx_legal_documents_current',
        columnNames: ['code', 'is_current'],
      }),
    ]);
  }

  private async createConsents(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('legal_consents')) return;

    await queryRunner.createTable(
      new Table({
        name: 'legal_consents',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          // `ON DELETE SET NULL`: la baja de cuenta es lógica, pero la purga
          // física de una cuenta pasada el periodo de retención no debe dejar
          // la constancia de consentimiento huérfana ni borrarla en cascada.
          {
            name: 'user_id',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'subject_email',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          { name: 'document_code', type: 'varchar', length: '40' },
          { name: 'document_version', type: 'varchar', length: '20' },
          {
            name: 'document_hash',
            type: 'varchar',
            length: '64',
            isNullable: true,
          },
          { name: 'granted', type: 'boolean', default: false },
          { name: 'consent_method', type: 'varchar', length: '40' },
          { name: 'source', type: 'varchar', length: '40' },
          { name: 'ip', type: 'varchar', length: '64', isNullable: true },
          {
            name: 'user_agent',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          // `text` y no `json`: el tipo `json` con DEFAULT no es portable entre
          // PostgreSQL y MySQL. El mapeo como `simple-json` vive en la entidad,
          // igual que en `audit_logs.metadata`.
          { name: 'metadata', type: 'text', isNullable: true },
          { name: 'created_at', type: 'timestamp' },
          { name: 'updated_at', type: 'timestamp' },
          { name: 'deleted_at', type: 'timestamp', isNullable: true },
        ],
        foreignKeys: [
          {
            name: 'fk_legal_consents_user',
            columnNames: ['user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndices('legal_consents', [
      new TableIndex({
        name: 'idx_legal_consents_user',
        columnNames: ['user_id', 'document_code'],
      }),
      new TableIndex({
        name: 'idx_legal_consents_subject',
        columnNames: ['subject_email'],
      }),
      new TableIndex({
        name: 'idx_legal_consents_code_time',
        columnNames: ['document_code', 'created_at'],
      }),
    ]);
  }

  /**
   * Primera versión de cada documento, en español.
   *
   * Las filas son la **identidad** del documento; el texto vive en el front.
   * Cuando se reescriba un Términos hay que: añadir la fila con la versión
   * nueva en `is_current`, pasar la anterior a `false`, y subir la versión en
   * `legal.catalogs.ts` del front en el mismo commit. Sin el paso de la fila
   * anterior a `false`, `GET /legal/documents` devolvería dos versiones
   * vigentes y el front no sabría cuál mostrar.
   *
   * `blocks_registration = false` en COOKIES, REFUND, IMAGE_RIGHTS y
   * MARKETING: negarse a la política de cookies, a la de reembolso, a ceder la
   * imagen o a recibir correos comerciales no impide usar el servicio. El art.
   * 16 de la LFPDPPP obliga a informar, no a aceptar para seguir navegando.
   */
  private async seedCurrentVersions(queryRunner: QueryRunner): Promise<void> {
    const effectiveDate = '2026-10-01';

    await upsertSeedRows(queryRunner, {
      table: 'legal_documents',
      matchBy: ['code', 'version'],
      rows: [
        {
          code: 'TERMS',
          version: '1.0.0',
          locale: 'es',
          title: 'Términos y condiciones',
          effective_date: effectiveDate,
          is_current: true,
          blocks_registration: true,
        },
        {
          code: 'PRIVACY',
          version: '1.0.0',
          locale: 'es',
          title: 'Aviso de privacidad',
          effective_date: effectiveDate,
          is_current: true,
          blocks_registration: true,
        },
        {
          code: 'COOKIES',
          version: '1.0.0',
          locale: 'es',
          title: 'Política de cookies',
          effective_date: effectiveDate,
          is_current: true,
          blocks_registration: false,
        },
        {
          code: 'REFUND',
          version: '1.0.0',
          locale: 'es',
          title: 'Política de reembolso',
          effective_date: effectiveDate,
          is_current: true,
          blocks_registration: false,
        },
        {
          code: 'IMAGE_RIGHTS',
          version: '1.0.0',
          locale: 'es',
          title: 'Cesión de derechos de imagen',
          effective_date: effectiveDate,
          is_current: true,
          blocks_registration: false,
        },
        {
          code: 'MARKETING',
          version: '1.0.0',
          locale: 'es',
          title: 'Autorización de comunicaciones comerciales',
          effective_date: effectiveDate,
          is_current: true,
          blocks_registration: false,
        },
      ],
      // `content_hash` e `id` los rellena el cliente al aceptar; aquí no se
      // tocan, para no pisar una huella ya registrada con esta versión.
      updateColumns: ['title', 'is_current', 'blocks_registration'],
    });
  }
}
