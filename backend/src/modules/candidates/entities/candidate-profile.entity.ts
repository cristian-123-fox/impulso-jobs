import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { DocumentType } from '@/modules/candidates/enums/document-type.enum';

/**
 * Perfil del aspirante (1:1 con `users`). Desde T36 admite **México, Colombia,
 * Estados Unidos y Canadá**; la empresa y la vacante siguen siendo mexicanas.
 *
 * Tres columnas sostienen eso: `country` (residencia), `document_country`
 * (emisor del documento — no siempre coinciden) y `phone_country`, que existe
 * porque `+1` es Estados Unidos **y** Canadá y el E.164 no los distingue.
 */
@Entity('candidate_profiles')
@Index(
  'uq_candidate_profiles_document',
  ['documentCountry', 'documentType', 'documentNumber'],
  { unique: true },
)
export class CandidateProfile extends BaseEntity {
  @Index('uq_candidate_profiles_user_id', { unique: true })
  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  userId!: string;

  @Column({ name: 'first_name', type: 'varchar', length: 80 })
  firstName!: string;

  @Column({ name: 'last_name', type: 'varchar', length: 80 })
  lastName!: string;

  /**
   * País emisor del documento (ISO 3166-1 alpha-2). Distinto de `country`: una
   * persona residente en Estados Unidos puede identificarse con su pasaporte
   * mexicano.
   */
  @Column({
    name: 'document_country',
    type: 'varchar',
    length: 2,
    default: 'MX',
  })
  documentCountry!: string;

  @Column({ name: 'document_type', type: 'varchar', length: 20 })
  documentType!: DocumentType;

  /**
   * Único por `(document_country, document_type, document_number)` — ver el
   * `@Index` de la clase. Un pasaporte `AB123456` mexicano y uno colombiano son
   * personas distintas, y el índice global anterior los tomaba por la misma.
   */
  @Column({ name: 'document_number', type: 'varchar', length: 40 })
  documentNumber!: string;

  @Column({ type: 'varchar', length: 18, nullable: true })
  curp?: string | null;

  @Column({ name: 'birth_date', type: 'date' })
  birthDate!: string;

  @Column({
    name: 'professional_title',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  professionalTitle?: string | null;

  @Column({ type: 'text', nullable: true })
  summary?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address?: string | null;

  @Column({
    name: 'profile_photo_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  profilePhotoUrl?: string | null;

  /** País de residencia (ISO 3166-1 alpha-2). La columna admite 60 por historia. */
  @Column({ type: 'varchar', length: 60, default: 'MX' })
  country!: string;

  @Column({ type: 'varchar', length: 10 })
  state!: string;

  @Column({ type: 'varchar', length: 120 })
  municipality!: string;

  /** E.164 (`+523312345678`). Normalizado al guardar, nunca en crudo. */
  @Column({ type: 'varchar', length: 20, nullable: true })
  phone?: string | null;

  /**
   * País del teléfono. Existe porque `+1` es Estados Unidos **y** Canadá:
   * distinguirlos por el número exigiría la tabla de códigos de área del NANP.
   * `null` cuando no hay teléfono — un país de teléfono sin teléfono es ruido.
   */
  @Column({ name: 'phone_country', type: 'varchar', length: 2, nullable: true })
  phoneCountry?: string | null;
}
