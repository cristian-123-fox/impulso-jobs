import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { CompanyUser } from '@/modules/companies/entities/company-user.entity';
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

  save(member: CompanyUser, manager?: EntityManager): Promise<CompanyUser> {
    return this.repo(manager).save(member);
  }
}
