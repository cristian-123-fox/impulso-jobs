import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CandidateApplication } from '@/modules/applications/entities/candidate-application.entity';
import { Vacancy } from '@/modules/vacancies/entities/vacancy.entity';
import { VacancyStatus } from '@/modules/vacancies/enums/vacancy.enums';
import {
  CountByKey,
  DailyCount,
  ExpiringVacancyRow,
  ICompanyDashboardRepository,
  VacancyPerformanceRow,
} from '@/modules/dashboard/repositories/company-dashboard.repository.interface';
import {
  toDateKey,
  toNumber,
} from '@/modules/dashboard/repositories/aggregate.util';

/**
 * Agregados del panel de la empresa. Todo se resuelve en la base de datos con
 * `COUNT`/`SUM`/`GROUP BY`: nunca se traen filas para contarlas en Node.
 *
 * Los valores pasan por `toNumber()`/`toDateKey()` porque MySQL y PostgreSQL no
 * devuelven los agregados con el mismo tipo (ver `aggregate.util.ts`).
 */
@Injectable()
export class CompanyDashboardRepository implements ICompanyDashboardRepository {
  constructor(
    @InjectRepository(Vacancy)
    private readonly vacancies: Repository<Vacancy>,
    @InjectRepository(CandidateApplication)
    private readonly applications: Repository<CandidateApplication>,
  ) {}

  async countVacanciesByStatus(companyId: string): Promise<CountByKey[]> {
    const rows = await this.vacancies
      .createQueryBuilder('v')
      .select('v.status', 'key')
      .addSelect('COUNT(*)', 'count')
      .where('v.company_id = :companyId', { companyId })
      .groupBy('v.status')
      .getRawMany<{ key: string; count: string | number }>();
    return rows.map((row) => ({ key: row.key, count: toNumber(row.count) }));
  }

  async sumVacancyViews(companyId: string): Promise<number> {
    const row = await this.vacancies
      .createQueryBuilder('v')
      .select('COALESCE(SUM(v.views_count), 0)', 'total')
      .where('v.company_id = :companyId', { companyId })
      .getRawOne<{ total: string | number }>();
    return toNumber(row?.total);
  }

  countApplications(companyId: string): Promise<number> {
    return this.applications.count({ where: { companyId } });
  }

  async countUnreadApplications(companyId: string): Promise<number> {
    return this.applications
      .createQueryBuilder('a')
      .where('a.company_id = :companyId', { companyId })
      .andWhere('a.read_at IS NULL')
      .getCount();
  }

  async countApplicationsSince(
    companyId: string,
    since: Date,
  ): Promise<number> {
    return this.applications
      .createQueryBuilder('a')
      .where('a.company_id = :companyId', { companyId })
      .andWhere('a.applied_at >= :since', { since })
      .getCount();
  }

  async countApplicationsByStatus(companyId: string): Promise<CountByKey[]> {
    const rows = await this.applications
      .createQueryBuilder('a')
      .select('a.status_code', 'key')
      .addSelect('COUNT(*)', 'count')
      .where('a.company_id = :companyId', { companyId })
      .groupBy('a.status_code')
      .getRawMany<{ key: string; count: string | number }>();
    return rows.map((row) => ({ key: row.key, count: toNumber(row.count) }));
  }

  async applicationsPerDay(
    companyId: string,
    from: Date,
    to: Date,
  ): Promise<DailyCount[]> {
    // `CAST(... AS DATE)` y no `DATE(...)`: es SQL estándar y lo entienden los
    // dos motores. El resultado llega como `Date` en PostgreSQL y como texto en
    // MySQL, así que se normaliza al salir.
    const rows = await this.applications
      .createQueryBuilder('a')
      .select('CAST(a.applied_at AS DATE)', 'day')
      .addSelect('COUNT(*)', 'count')
      .where('a.company_id = :companyId', { companyId })
      .andWhere('a.applied_at >= :from', { from })
      .andWhere('a.applied_at <= :to', { to })
      .groupBy('CAST(a.applied_at AS DATE)')
      .orderBy('CAST(a.applied_at AS DATE)', 'ASC')
      .getRawMany<{ day: Date | string; count: string | number }>();

    return rows.map((row) => ({
      date: toDateKey(row.day),
      count: toNumber(row.count),
    }));
  }

  async topVacancies(
    companyId: string,
    limit: number,
  ): Promise<VacancyPerformanceRow[]> {
    const rows = await this.vacancies
      .createQueryBuilder('v')
      .leftJoin(CandidateApplication, 'a', 'a.vacancy_id = v.id')
      .select('v.id', 'id')
      .addSelect('v.title', 'title')
      .addSelect('v.status', 'status')
      .addSelect('v.views_count', 'views')
      .addSelect('COUNT(a.id)', 'applications')
      .where('v.company_id = :companyId', { companyId })
      // Las cuatro columnas no agregadas: PostgreSQL lo exige siempre y MySQL
      // también con ONLY_FULL_GROUP_BY, que es el modo por defecto desde 5.7.
      .groupBy('v.id')
      .addGroupBy('v.title')
      .addGroupBy('v.status')
      .addGroupBy('v.views_count')
      .orderBy('applications', 'DESC')
      .addOrderBy('views', 'DESC')
      .limit(limit)
      .getRawMany<{
        id: string;
        title: string;
        status: string;
        views: string | number;
        applications: string | number;
      }>();

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      views: toNumber(row.views),
      applications: toNumber(row.applications),
    }));
  }

  async expiringVacancies(
    companyId: string,
    from: Date,
    to: Date,
    limit: number,
  ): Promise<ExpiringVacancyRow[]> {
    const rows = await this.vacancies
      .createQueryBuilder('v')
      .leftJoin(CandidateApplication, 'a', 'a.vacancy_id = v.id')
      .select('v.id', 'id')
      .addSelect('v.title', 'title')
      .addSelect('v.expires_at', 'expiresAt')
      .addSelect('COUNT(a.id)', 'applications')
      .where('v.company_id = :companyId', { companyId })
      .andWhere('v.status = :status', { status: VacancyStatus.ACTIVE })
      .andWhere('v.expires_at IS NOT NULL')
      .andWhere('v.expires_at >= :from', { from })
      .andWhere('v.expires_at <= :to', { to })
      .groupBy('v.id')
      .addGroupBy('v.title')
      .addGroupBy('v.expires_at')
      .orderBy('v.expires_at', 'ASC')
      .limit(limit)
      .getRawMany<{
        id: string;
        title: string;
        expiresAt: Date | string;
        applications: string | number;
      }>();

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      expiresAt: new Date(row.expiresAt),
      applications: toNumber(row.applications),
    }));
  }
}
