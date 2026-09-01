import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, IsNull, Repository } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { CandidateApplication } from '@/modules/applications/entities/candidate-application.entity';
import {
  CandidateApplicationSearch,
  CompanyApplicationSearch,
  ICandidateApplicationRepository,
} from '@/modules/applications/repositories/candidate-application.repository.interface';

@Injectable()
export class CandidateApplicationRepository
  extends BaseRepository<CandidateApplication>
  implements ICandidateApplicationRepository
{
  constructor(
    @InjectRepository(CandidateApplication)
    repo: Repository<CandidateApplication>,
  ) {
    super(repo);
  }

  findById(
    id: string,
    manager?: EntityManager,
  ): Promise<CandidateApplication | null> {
    return this.repo(manager).findOne({ where: { id } });
  }

  findByIdAndProfile(
    id: string,
    candidateProfileId: string,
    manager?: EntityManager,
  ): Promise<CandidateApplication | null> {
    return this.repo(manager).findOne({ where: { id, candidateProfileId } });
  }

  findByIdAndCompany(
    id: string,
    companyId: string,
    manager?: EntityManager,
  ): Promise<CandidateApplication | null> {
    return this.repo(manager).findOne({ where: { id, companyId } });
  }

  findAndCountByProfile(
    criteria: CandidateApplicationSearch,
    manager?: EntityManager,
  ): Promise<[CandidateApplication[], number]> {
    const where: FindOptionsWhere<CandidateApplication> = {
      candidateProfileId: criteria.candidateProfileId,
    };
    if (criteria.statusCode) where.statusCode = criteria.statusCode;

    return this.repo(manager).findAndCount({
      where,
      order: { appliedAt: 'DESC' },
      skip: (criteria.page - 1) * criteria.limit,
      take: criteria.limit,
    });
  }

  findAndCountByCompany(
    criteria: CompanyApplicationSearch,
    manager?: EntityManager,
  ): Promise<[CandidateApplication[], number]> {
    return this.repo(manager).findAndCount({
      where: this.buildCompanyWhere(criteria),
      order: { appliedAt: 'DESC' },
      skip: (criteria.page - 1) * criteria.limit,
      take: criteria.limit,
    });
  }

  countUnreadByCompany(
    companyId: string,
    vacancyId?: string,
    manager?: EntityManager,
  ): Promise<number> {
    return this.repo(manager).count({
      where: {
        companyId,
        readAt: IsNull(),
        ...(vacancyId && { vacancyId }),
      },
    });
  }

  async existsByProfileAndVacancy(
    candidateProfileId: string,
    vacancyId: string,
    manager?: EntityManager,
  ): Promise<boolean> {
    const count = await this.repo(manager).count({
      where: { candidateProfileId, vacancyId },
    });
    return count > 0;
  }

  findByVacancy(
    vacancyId: string,
    manager?: EntityManager,
  ): Promise<CandidateApplication[]> {
    return this.repo(manager).find({
      where: { vacancyId },
      order: { appliedAt: 'ASC' },
    });
  }

  /**
   * Conteo por estado para las tarjetas del embudo. Se resuelve en SQL para no
   * traer todas las filas sólo para contarlas.
   */
  async countByCompanyGroupedByStatus(
    companyId: string,
    vacancyId?: string,
    manager?: EntityManager,
  ): Promise<Record<string, number>> {
    const qb = this.repo(manager)
      .createQueryBuilder('application')
      .select('application.status_code', 'code')
      .addSelect('COUNT(*)', 'total')
      .where('application.company_id = :companyId', { companyId })
      // `findAndCount` respeta el soft delete automáticamente; el query builder
      // en crudo no, así que se excluye a mano.
      .andWhere('application.deleted_at IS NULL')
      .groupBy('application.status_code');

    if (vacancyId) {
      qb.andWhere('application.vacancy_id = :vacancyId', { vacancyId });
    }

    const rows = await qb.getRawMany<{ code: string; total: string }>();
    return rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.code] = Number(row.total);
      return acc;
    }, {});
  }

  save(
    application: CandidateApplication,
    manager?: EntityManager,
  ): Promise<CandidateApplication> {
    return this.repo(manager).save(application);
  }

  private buildCompanyWhere(
    criteria: CompanyApplicationSearch,
  ): FindOptionsWhere<CandidateApplication> {
    const where: FindOptionsWhere<CandidateApplication> = {
      companyId: criteria.companyId,
    };
    if (criteria.vacancyId) where.vacancyId = criteria.vacancyId;
    if (criteria.statusCode) where.statusCode = criteria.statusCode;
    return where;
  }
}
