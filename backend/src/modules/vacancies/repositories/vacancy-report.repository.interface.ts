import { EntityManager } from 'typeorm';
import { VacancyReport } from '@/modules/vacancies/entities/vacancy-report.entity';
import { VacancyReportStatus } from '@/modules/vacancies/enums/vacancy-report.enums';

export const VACANCY_REPORT_REPOSITORY = 'VACANCY_REPORT_REPOSITORY';

export interface VacancyReportSearch {
  status?: VacancyReportStatus;
  page: number;
  limit: number;
}

export interface IVacancyReportRepository {
  existsByVacancyAndReporter(
    vacancyId: string,
    reporterUserId: string,
    manager?: EntityManager,
  ): Promise<boolean>;
  findById(id: string, manager?: EntityManager): Promise<VacancyReport | null>;
  findAndCount(
    criteria: VacancyReportSearch,
    manager?: EntityManager,
  ): Promise<[VacancyReport[], number]>;
  save(report: VacancyReport, manager?: EntityManager): Promise<VacancyReport>;
}
