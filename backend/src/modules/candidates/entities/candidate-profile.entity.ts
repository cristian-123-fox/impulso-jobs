import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { DocumentType } from '@/modules/candidates/enums/document-type.enum';

/** Perfil del candidato (1:1 con `users`). Localizado a México. */
@Entity('candidate_profiles')
export class CandidateProfile extends BaseEntity {
  @Index('uq_candidate_profiles_user_id', { unique: true })
  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  userId!: string;

  @Column({ name: 'first_name', type: 'varchar', length: 80 })
  firstName!: string;

  @Column({ name: 'last_name', type: 'varchar', length: 80 })
  lastName!: string;

  @Column({ name: 'document_type', type: 'varchar', length: 20 })
  documentType!: DocumentType;

  @Index('uq_candidate_profiles_document_number', { unique: true })
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

  @Column({ type: 'varchar', length: 60, default: 'MX' })
  country!: string;

  @Column({ type: 'varchar', length: 10 })
  state!: string;

  @Column({ type: 'varchar', length: 120 })
  municipality!: string;
}
