import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import {
  ConsentMethod,
  ConsentSource,
  LegalDocumentCode,
} from '@/modules/legal/enums/legal.enums';

/**
 * Constancia de una aceptación (o de una negativa) a un documento legal.
 *
 * **Sólo crece.** No hay `updated_at` con significado ni método que modifique
 * una fila existente: revocar no es `UPDATE`, es **insertar otra fila** con
 * `granted = false` para el mismo documento. Así el historial completo —qué se
 * aceptó, cuándo, desde dónde y con qué huella del texto— queda siempre
 * reconstruible, que es justo lo que un titular puede exigir que se le
 * demuestre (art. 22 LFPDPPP) y lo que la Secretaría revisaría en una
 * verificación.
 *
 * `actor_user_id` es `ON DELETE SET NULL` porque la baja de cuenta es lógica, no
 * física; la fila vive más que la cuenta. Cuando una purga física sí lo toque,
 * queda el `subject_email` y la IP como rastro.
 */
@Entity('legal_consents')
@Index('idx_legal_consents_user', ['userId', 'documentCode'])
@Index('idx_legal_consents_subject', ['subjectEmail'])
// `createdAt`, no `consentedAt`: el instante de la aceptación es el
// `created_at` que hereda `BaseEntity`, y en el DTO se expone con el nombre
// `consentedAt`. Un índice tiene que citar la propiedad de la entidad, no la
// del DTO: TypeORM lo resuelve al construir los metadatos y aborta el arranque
// si no la encuentra.
@Index('idx_legal_consents_code_time', ['documentCode', 'createdAt'])
export class LegalConsent extends BaseEntity {
  /**
   * Titular identificado. `null` en los flujos sin sesión (formulario de
   * contacto, newsletter, banner de cookies): ahí la trazabilidad la da
   * `subjectEmail`.
   */
  @Column({ name: 'user_id', type: 'varchar', length: 36, nullable: true })
  userId?: string | null;

  /** Correo del titular. Se guarda también con sesión para no depender del ID. */
  @Column({
    name: 'subject_email',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  subjectEmail?: string | null;

  @Column({ name: 'document_code', type: 'varchar', length: 40 })
  documentCode!: LegalDocumentCode;

  /** Copia literal: si el catálogo cambia, esta fila sigue siendo legible. */
  @Column({ name: 'document_version', type: 'varchar', length: 20 })
  documentVersion!: string;

  /** Huella del texto mostrado, tal como la declaró el cliente. */
  @Column({
    name: 'document_hash',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  documentHash?: string | null;

  /** `true` aceptó, `false` rechazó (o revocó) esa finalidad o documento. */
  @Column({ type: 'boolean', default: false })
  granted!: boolean;

  @Column({ name: 'consent_method', type: 'varchar', length: 40 })
  consentMethod!: ConsentMethod;

  @Column({ type: 'varchar', length: 40 })
  source!: ConsentSource;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip?: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 255, nullable: true })
  userAgent?: string | null;

  /**
   * Contexto de la aceptación: código de la vacante, id del plan, versión del
   * documento en el momento del clic. Es `text` en la migración y `simple-json`
   * en la entidad, igual que `audit_logs.metadata`: el esquema tiene que correr
   * en PostgreSQL y MySQL y el tipo `json` no es portable.
   */
  @Column({ type: 'simple-json', nullable: true })
  metadata?: Record<string, unknown> | null;
}
