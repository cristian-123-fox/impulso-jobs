import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CandidateApplication } from '@/modules/applications/entities/candidate-application.entity';
import { PaymentStatus } from '@/modules/billing/enums/billing.enums';
import { PromotionOrder } from '@/modules/billing/entities/promotion-order.entity';
import { Company } from '@/modules/companies/entities/company.entity';
import { User } from '@/modules/iam/users/entities/user.entity';
import { Vacancy } from '@/modules/vacancies/entities/vacancy.entity';
import { VacancyReport } from '@/modules/vacancies/entities/vacancy-report.entity';
import { VacancyReportStatus } from '@/modules/vacancies/enums/vacancy-report.enums';
import {
  CountByKey,
  DailyCount,
} from '@/modules/dashboard/repositories/company-dashboard.repository.interface';
import {
  IAdminDashboardRepository,
  RecentCompanyRow,
  RevenueSummary,
} from '@/modules/dashboard/repositories/admin-dashboard.repository.interface';
import {
  toDateKey,
  toNumber,
} from '@/modules/dashboard/repositories/aggregate.util';

@Injectable()
export class AdminDashboardRepository implements IAdminDashboardRepository {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Company) private readonly companies: Repository<Company>,
    @InjectRepository(Vacancy) private readonly vacancies: Repository<Vacancy>,
    @InjectRepository(CandidateApplication)
    private readonly applications: Repository<CandidateApplication>,
    @InjectRepository(VacancyReport)
    private readonly reports: Repository<VacancyReport>,
    @InjectRepository(PromotionOrder)
    private readonly orders: Repository<PromotionOrder>,
  ) {}

  async countUsersByRole(): Promise<CountByKey[]> {
    const rows = await this.users
      .createQueryBuilder('u')
      .select('u.role', 'key')
      .addSelect('COUNT(*)', 'count')
      .groupBy('u.role')
      .getRawMany<{ key: string; count: string | number }>();
    return rows.map((row) => ({ key: row.key, count: toNumber(row.count) }));
  }

  async countUsersByStatus(): Promise<CountByKey[]> {
    const rows = await this.users
      .createQueryBuilder('u')
      .select('u.status', 'key')
      .addSelect('COUNT(*)', 'count')
      .groupBy('u.status')
      .getRawMany<{ key: string; count: string | number }>();
    return rows.map((row) => ({ key: row.key, count: toNumber(row.count) }));
  }

  async signupsPerDay(
    from: Date,
    to: Date,
  ): Promise<{ date: string; role: string; count: number }[]> {
    const rows = await this.users
      .createQueryBuilder('u')
      .select('CAST(u.created_at AS DATE)', 'day')
      .addSelect('u.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .where('u.created_at >= :from', { from })
      .andWhere('u.created_at <= :to', { to })
      .groupBy('CAST(u.created_at AS DATE)')
      .addGroupBy('u.role')
      .orderBy('CAST(u.created_at AS DATE)', 'ASC')
      .getRawMany<{
        day: Date | string;
        role: string;
        count: string | number;
      }>();

    return rows.map((row) => ({
      date: toDateKey(row.day),
      role: row.role,
      count: toNumber(row.count),
    }));
  }

  countCompanies(): Promise<number> {
    return this.companies.count();
  }

  async countCompaniesByState(limit: number): Promise<CountByKey[]> {
    const rows = await this.companies
      .createQueryBuilder('c')
      .select('c.state', 'key')
      .addSelect('COUNT(*)', 'count')
      .groupBy('c.state')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany<{ key: string; count: string | number }>();
    return rows.map((row) => ({ key: row.key, count: toNumber(row.count) }));
  }

  async countVacanciesByStatus(): Promise<CountByKey[]> {
    const rows = await this.vacancies
      .createQueryBuilder('v')
      .select('v.status', 'key')
      .addSelect('COUNT(*)', 'count')
      .groupBy('v.status')
      .getRawMany<{ key: string; count: string | number }>();
    return rows.map((row) => ({ key: row.key, count: toNumber(row.count) }));
  }

  countApplications(): Promise<number> {
    return this.applications.count();
  }

  async applicationsPerDay(from: Date, to: Date): Promise<DailyCount[]> {
    const rows = await this.applications
      .createQueryBuilder('a')
      .select('CAST(a.applied_at AS DATE)', 'day')
      .addSelect('COUNT(*)', 'count')
      .where('a.applied_at >= :from', { from })
      .andWhere('a.applied_at <= :to', { to })
      .groupBy('CAST(a.applied_at AS DATE)')
      .orderBy('CAST(a.applied_at AS DATE)', 'ASC')
      .getRawMany<{ day: Date | string; count: string | number }>();

    return rows.map((row) => ({
      date: toDateKey(row.day),
      count: toNumber(row.count),
    }));
  }

  countPendingReports(): Promise<number> {
    return this.reports.count({
      where: { status: VacancyReportStatus.PENDING },
    });
  }

  async countVacanciesByArea(limit: number): Promise<CountByKey[]> {
    const rows = await this.vacancies
      .createQueryBuilder('v')
      .select('v.professional_area_id', 'key')
      .addSelect('COUNT(*)', 'count')
      .where('v.professional_area_id IS NOT NULL')
      .groupBy('v.professional_area_id')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany<{ key: number | string; count: string | number }>();
    return rows.map((row) => ({
      key: String(row.key),
      count: toNumber(row.count),
    }));
  }

  /**
   * Sólo órdenes **pagadas** y por `paid_at`, no por `created_at`: una orden de
   * OXXO se crea hoy y se cobra tres días después, y el ingreso pertenece al
   * día en que entró el dinero.
   */
  async revenueBetween(from: Date, to: Date): Promise<RevenueSummary> {
    const row = await this.orders
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.total), 0)', 'amount')
      .addSelect('COUNT(*)', 'orders')
      .where('o.payment_status = :status', { status: PaymentStatus.PAID })
      .andWhere('o.paid_at IS NOT NULL')
      .andWhere('o.paid_at >= :from', { from })
      .andWhere('o.paid_at <= :to', { to })
      .getRawOne<{ amount: string | number; orders: string | number }>();

    return { amount: toNumber(row?.amount), orders: toNumber(row?.orders) };
  }

  async recentCompanies(limit: number): Promise<RecentCompanyRow[]> {
    const rows = await this.companies.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
    return rows.map((row) => ({
      id: row.id,
      businessName: row.businessName,
      state: row.state,
      createdAt: row.createdAt,
    }));
  }
}
