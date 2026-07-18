import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { Company } from '@/modules/companies/entities/company.entity';
import { ICompanyRepository } from '@/modules/companies/repositories/company.repository.interface';

@Injectable()
export class CompanyRepository
  extends BaseRepository<Company>
  implements ICompanyRepository
{
  constructor(@InjectRepository(Company) repo: Repository<Company>) {
    super(repo);
  }

  async existsByRfc(rfc: string, manager?: EntityManager): Promise<boolean> {
    return (await this.repo(manager).count({ where: { rfc } })) > 0;
  }

  findById(id: string, manager?: EntityManager): Promise<Company | null> {
    return this.repo(manager).findOne({ where: { id } });
  }

  save(company: Company, manager?: EntityManager): Promise<Company> {
    return this.repo(manager).save(company);
  }
}
