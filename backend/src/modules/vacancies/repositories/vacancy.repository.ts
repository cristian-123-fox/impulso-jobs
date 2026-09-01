import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityManager,
  FindOperator,
  FindOptionsOrder,
  FindOptionsWhere,
  In,
  LessThanOrEqual,
  MoreThanOrEqual,
  Raw,
  Repository,
} from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { containsInsensitive } from '@/common/utils/search.util';
import { Vacancy } from '@/modules/vacancies/entities/vacancy.entity';
import {
  PublicVacancySort,
  VacancyStatus,
} from '@/modules/vacancies/enums/vacancy.enums';
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

  findByIds(ids: string[], manager?: EntityManager): Promise<Vacancy[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.repo(manager).find({ where: { id: In(ids) } });
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
      order: this.buildPublicOrder(criteria.sort),
      skip: (criteria.page - 1) * criteria.limit,
      take: criteria.limit,
    });
  }

  findPublicById(id: string, manager?: EntityManager): Promise<Vacancy | null> {
    return this.repo(manager).findOne({
      where: { id, status: VacancyStatus.ACTIVE },
    });
  }

  /** Un `expires_at` NULL nunca vence: el comparador SQL lo excluye solo. */
  findExpiredActive(now: Date, manager?: EntityManager): Promise<Vacancy[]> {
    return this.repo(manager).find({
      where: { status: VacancyStatus.ACTIVE, expiresAt: LessThanOrEqual(now) },
      order: { expiresAt: 'ASC' },
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

  /** `UPDATE … SET views_count = views_count + :by`, atómico en BD. */
  async incrementViews(
    vacancyId: string,
    by: number,
    manager?: EntityManager,
  ): Promise<void> {
    await this.repo(manager).increment({ id: vacancyId }, 'viewsCount', by);
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
    if (criteria.areaId) base.professionalAreaId = criteria.areaId;
    if (criteria.publishedWithinDays) {
      base.publishedAt = MoreThanOrEqual(
        new Date(Date.now() - criteria.publishedWithinDays * 86_400_000),
      );
    }
    if (criteria.salaryMin !== undefined) {
      base.salaryMin = this.paysAtLeast(criteria.salaryMin);
    }

    const search = criteria.search?.trim();
    if (!search) return base;

    // Cada rama del OR necesita su propio parámetro SQL.
    return [
      { ...base, title: containsInsensitive(search, 'searchTitle') },
      { ...base, description: containsInsensitive(search, 'searchBody') },
    ];
  }

  /**
   * Vacantes que pagan al menos `amount`: el tope del rango (o el piso, si no
   * hay tope) alcanza la cifra y el salario es público. La condición se ancla
   * a `salary_min` pero referencia las otras columnas en crudo — la consulta
   * pública no tiene joins, así que el nombre sin alias es inequívoco y
   * portable entre PostgreSQL y MySQL.
   */
  private paysAtLeast(amount: number): FindOperator<string> {
    return Raw(
      (alias) =>
        `(salary_hidden = FALSE AND COALESCE(salary_max, ${alias}) >= :minSalary)`,
      { minSalary: amount },
    ) as FindOperator<string>;
  }

  private buildPublicOrder(
    sort?: PublicVacancySort,
  ): FindOptionsOrder<Vacancy> {
    switch (sort) {
      case PublicVacancySort.DATE:
        return { publishedAt: 'DESC', createdAt: 'DESC' };
      case PublicVacancySort.SALARY:
        // MySQL (el motor en producción) ordena los NULL al final en DESC;
        // PostgreSQL los pondría primero. Divergencia asumida y documentada.
        return { salaryMax: 'DESC', salaryMin: 'DESC', refreshedAt: 'DESC' };
      default:
        // Prioridad monetizada del portal: destacadas, urgentes, lo más
        // fresco. `refreshedAt` se rellena al publicar, así que nunca hay
        // NULLs que alteren el orden entre motores.
        return {
          isFeatured: 'DESC',
          isUrgent: 'DESC',
          refreshedAt: 'DESC',
          createdAt: 'DESC',
        };
    }
  }
}
