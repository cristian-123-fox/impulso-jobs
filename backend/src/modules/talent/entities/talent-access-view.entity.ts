import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

/**
 * Registro de qué CV de la base de talento ya consultó cada empresa.
 *
 * No está en el ER original, pero sin él el cupo sería inservible: abrir dos
 * veces el mismo perfil (o recargar la página) gastaría dos visitas de las 20
 * del plan. Con este registro, **la primera consulta cobra y las siguientes son
 * gratuitas para siempre** — la empresa ya pagó por ese CV.
 */
@Entity('talent_access_views')
@Index(
  'uq_talent_access_views_company_candidate',
  ['companyId', 'candidateProfileId'],
  { unique: true },
)
export class TalentAccessView extends BaseEntity {
  @Index('idx_talent_access_views_company_id')
  @Column({ name: 'company_id', type: 'varchar', length: 36 })
  companyId!: string;

  @Column({ name: 'candidate_profile_id', type: 'varchar', length: 36 })
  candidateProfileId!: string;

  /** Cupo del que se descontó la visita. */
  @Column({ name: 'grant_id', type: 'varchar', length: 36 })
  grantId!: string;

  @Column({ name: 'viewed_at', type: 'timestamp' })
  viewedAt!: Date;
}
