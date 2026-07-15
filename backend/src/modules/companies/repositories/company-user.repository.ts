import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
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

  save(member: CompanyUser, manager?: EntityManager): Promise<CompanyUser> {
    return this.repo(manager).save(member);
  }
}
