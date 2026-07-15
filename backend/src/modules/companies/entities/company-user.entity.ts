import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { CompanyMemberRole } from '@/modules/companies/enums/company-member-role.enum';

/** Membresía usuario↔empresa. El creador entra como OWNER. */
@Entity('company_users')
@Index('uq_company_users_company_user', ['companyId', 'userId'], {
  unique: true,
})
export class CompanyUser extends BaseEntity {
  @Column({ name: 'company_id', type: 'varchar', length: 36 })
  companyId!: string;

  @Index('idx_company_users_user_id')
  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  userId!: string;

  @Column({ type: 'varchar', length: 20, default: CompanyMemberRole.OWNER })
  role!: CompanyMemberRole;
}
