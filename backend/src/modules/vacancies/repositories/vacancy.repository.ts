import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, Repository } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { containsInsensitive } from '@/common/utils/search.util';
import { Vacancy } from '@/modules/vacancies/entities/vacancy.entity';
import { VacancyStatus } from '@/modules/vacancies/enums/vacancy.enums';
import {
  CompanyVacancySearch,
  IVacancyRepository,
  PublicVacancySearch,
} from '@/modules/vacancies/repositories/vacancy.repository.interface';

@Injectable()
export class VacancyRepository
  extends BaseRepository<Vacancy>
  implements IVacancyRepository
{
  constructor(@InjectRepository(Vacancy) repo: Repository<Vacancy>) {
    super(repo);
  }

  findById(id: string, manager?: EntityManager): Promise<Vacancy | null> {
    return this.repo(manager).findOne({ where: { id } });
  }

  findByIdAndCompany(
    id: string,
    companyId: string,
    manager?: EntityManager,
  ): Promise<Vacancy | null> {
    return this.repo(manager).findOne({ where: { id, companyId } });
  }

  findAndCountByCompany(
    criteria: CompanyVacancySearch,
    manager?: EntityManager,
  ): Promise<[Vacancy[], number]> {
    const where: FindOptionsWhere<Vacancy> = { companyId: criteria.companyId };
    if (criteria.status) where.status = criteria.status;
    const search = criteria.search?.trim();
    if (search) where.title = containsInsensitive(search, 'companySearch');

    return this.repo(manager).findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (criteria.page - 1) * criteria.limit,
      take: criteria.limit,
    });
  }

  findAndCountPublic(
    criteria: PublicVacancySearch,
    manager?: EntityManager,
  ): Promise<[Vacancy[], number]> {
    return this.repo(manager).findAndCount({
      where: this.buildPublicWhere(criteria),
      // Prioridad del portal: destacadas, luego urgentes, luego lo más fresco.
      // `refreshedAt` se rellena al publicar, así que nunca hay NULLs que
      // alteren el orden entre PostgreSQL y MySQL.
      order: {
        isFeatured: 'DESC',
        isUrgent: 'DESC',
        refreshedAt: 'DESC',
        createdAt: 'DESC',
      },
      skip: (criteria.page - 1) * criteria.limit,
      take: criteria.limit,
    });
  }

  findPublicById(id: string, manager?: EntityManager): Promise<Vacancy | null> {
    return this.repo(manager).findOne({
      where: { id, status: VacancyStatus.ACTIVE },
    });
  }

  countByCompany(
    companyId: string,
    status?: VacancyStatus,
    manager?: EntityManager,
  ): Promise<number> {
    return this.repo(manager).count({
      where: status ? { companyId, status } : { companyId },
    });
  }

  save(vacancy: Vacancy, manager?: EntityManager): Promise<Vacancy> {
    return this.repo(manager).save(vacancy);
  }

  /**
   * La búsqueda libre es un OR sobre título y descripción; TypeORM lo expresa
   * como arreglo de condiciones, así que el resto de filtros se repite en cada
   * rama.
   */
  private buildPublicWhere(
    criteria: PublicVacancySearch,
  ): FindOptionsWhere<Vacancy> | FindOptionsWhere<Vacancy>[] {
    const base: FindOptionsWhere<Vacancy> = { status: VacancyStatus.ACTIVE };
    if (criteria.state) base.state = criteria.state;
    if (criteria.municipality) {
      base.municipality = containsInsensitive(
        criteria.municipality,
        'municipality',
      );
    }
    if (criteria.employmentType) base.employmentType = criteria.employmentType;
    if (criteria.workMode) base.workMode = criteria.workMode;
    if (criteria.experienceLevel) {
      base.experienceLevel = criteria.experienceLevel;
    }

    const search = criteria.search?.trim();
    if (!search) return base;

    // Cada rama del OR necesita su propio parámetro SQL.
    return [
      { ...base, title: containsInsensitive(search, 'searchTitle') },
      { ...base, description: containsInsensitive(search, 'searchBody') },
    ];
  }
}
