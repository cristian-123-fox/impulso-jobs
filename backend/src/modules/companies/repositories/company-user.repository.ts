import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { CompanyUser } from '@/modules/companies/entities/company-user.entity';
import { CompanyMemberRole } from '@/modules/companies/enums/company-member-role.enum';
import { ICompanyUserRepository } from '@/modules/companies/repositories/company-user.repository.interface';

@Injectable()
export class CompanyUserRepository
  extends BaseRepository<CompanyUser>
  implements ICompanyUserRepository
{
  constructor(@InjectRepository(CompanyUser) repo: Repository<CompanyUser>) {
    super(repo);
  }

  findByUserId(
    userId: string,
    manager?: EntityManager,
  ): Promise<CompanyUser | null> {
    return this.repo(manager).findOne({ where: { userId } });
  }

  findByUserIds(
    userIds: string[],
    manager?: EntityManager,
  ): Promise<CompanyUser[]> {
    if (userIds.length === 0) return Promise.resolve([]);
    return this.repo(manager).find({ where: { userId: In(userIds) } });
  }

  findByCompanyIds(
    companyIds: string[],
    manager?: EntityManager,
  ): Promise<CompanyUser[]> {
    if (companyIds.length === 0) return Promise.resolve([]);
    return this.repo(manager).find({ where: { companyId: In(companyIds) } });
  }

  findByCompanyId(
    companyId: string,
    manager?: EntityManager,
  ): Promise<CompanyUser[]> {
    return this.repo(manager).find({
      where: { companyId },
      order: { createdAt: 'ASC' },
    });
  }

  findOne(
    companyId: string,
    userId: string,
    manager?: EntityManager,
  ): Promise<CompanyUser | null> {
    return this.repo(manager).findOne({ where: { companyId, userId } });
  }

  countByRole(
    companyId: string,
    role: CompanyMemberRole,
    manager?: EntityManager,
  ): Promise<number> {
    return this.repo(manager).count({ where: { companyId, role } });
  }

  save(member: CompanyUser, manager?: EntityManager): Promise<CompanyUser> {
    return this.repo(manager).save(member);
  }

  async remove(
    companyId: string,
    userId: string,
    manager?: EntityManager,
  ): Promise<void> {
    await this.repo(manager).delete({ companyId, userId });
  }
}
