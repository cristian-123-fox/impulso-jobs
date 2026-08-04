import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, In, Repository } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { containsInsensitive } from '@/common/utils/search.util';
import { Company } from '@/modules/companies/entities/company.entity';
import {
  CompanySearchCriteria,
  ICompanyRepository,
} from '@/modules/companies/repositories/company.repository.interface';

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

  findByIds(ids: string[], manager?: EntityManager): Promise<Company[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.repo(manager).find({ where: { id: In(ids) } });
  }

  save(company: Company, manager?: EntityManager): Promise<Company> {
    return this.repo(manager).save(company);
  }

  findAndCount(
    criteria: CompanySearchCriteria,
    manager?: EntityManager,
  ): Promise<[Company[], number]> {
    return this.repo(manager).findAndCount({
      where: this.buildWhere(criteria),
      order: { createdAt: 'DESC' },
      skip: (criteria.page - 1) * criteria.limit,
      take: criteria.limit,
    });
  }

  count(manager?: EntityManager): Promise<number> {
    return this.repo(manager).count();
  }

  /**
   * La búsqueda libre es un OR sobre tres columnas. TypeORM lo expresa como un
   * arreglo de condiciones (unidas con OR), así que el filtro de estado debe
   * repetirse en cada rama.
   */
  private buildWhere(
    criteria: CompanySearchCriteria,
  ): FindOptionsWhere<Company> | FindOptionsWhere<Company>[] {
    const base: FindOptionsWhere<Company> = {};
    if (criteria.state) base.state = criteria.state;

    const search = criteria.search?.trim();
    if (!search) return base;

    // Cada rama del OR necesita su propio parámetro SQL.
    return [
      { ...base, businessName: containsInsensitive(search, 'searchBusiness') },
      { ...base, legalName: containsInsensitive(search, 'searchLegal') },
      { ...base, rfc: containsInsensitive(search, 'searchRfc') },
    ];
  }
}
