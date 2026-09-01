import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '@/modules/audit/audit.module';
import { CompaniesModule } from '@/modules/companies/companies.module';
import { AuthModule } from '@/modules/iam/auth/auth.module';
import { PermissionsModule } from '@/modules/iam/permissions/permissions.module';
import { UsersModule } from '@/modules/iam/users/users.module';
import { AdminVacancyReportsController } from '@/modules/vacancies/controllers/admin-vacancy-reports.controller';
import { CompanyVacanciesController } from '@/modules/vacancies/controllers/company-vacancies.controller';
import { PublicVacanciesController } from '@/modules/vacancies/controllers/public-vacancies.controller';
import { VacancyReportsController } from '@/modules/vacancies/controllers/vacancy-reports.controller';
import { Vacancy } from '@/modules/vacancies/entities/vacancy.entity';
import { VacancyQuestion } from '@/modules/vacancies/entities/vacancy-question.entity';
import { VacancyQuestionOption } from '@/modules/vacancies/entities/vacancy-question-option.entity';
import { VacancyReport } from '@/modules/vacancies/entities/vacancy-report.entity';
import { VacancyViewEvent } from '@/modules/vacancies/entities/vacancy-view-event.entity';
import { VACANCY_QUESTION_REPOSITORY } from '@/modules/vacancies/repositories/vacancy-question.repository.interface';
import { VacancyQuestionRepository } from '@/modules/vacancies/repositories/vacancy-question.repository';
import { VACANCY_REPORT_REPOSITORY } from '@/modules/vacancies/repositories/vacancy-report.repository.interface';
import { VacancyReportRepository } from '@/modules/vacancies/repositories/vacancy-report.repository';
import { VACANCY_REPOSITORY } from '@/modules/vacancies/repositories/vacancy.repository.interface';
import { VacancyRepository } from '@/modules/vacancies/repositories/vacancy.repository';
import { VACANCY_VIEW_EVENT_REPOSITORY } from '@/modules/vacancies/repositories/vacancy-view-event.repository.interface';
import { VacancyViewEventRepository } from '@/modules/vacancies/repositories/vacancy-view-event.repository';
import { VacancyOwnershipService } from '@/modules/vacancies/services/vacancy-ownership.service';
import { CompanyVacanciesUseCase } from '@/modules/vacancies/use-cases/company-vacancies.use-case';
import { ConsolidateVacancyViewsUseCase } from '@/modules/vacancies/use-cases/consolidate-vacancy-views.use-case';
import { ExpireVacanciesUseCase } from '@/modules/vacancies/use-cases/expire-vacancies.use-case';
import { PublicVacanciesUseCase } from '@/modules/vacancies/use-cases/public-vacancies.use-case';
import { VacancyQuestionsUseCase } from '@/modules/vacancies/use-cases/vacancy-questions.use-case';
import { VacancyReportsUseCase } from '@/modules/vacancies/use-cases/vacancy-reports.use-case';
import { VacancyStatusUseCase } from '@/modules/vacancies/use-cases/vacancy-status.use-case';

/** M10: vacantes de la empresa y portal público de empleo. */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Vacancy,
      VacancyQuestion,
      VacancyQuestionOption,
      VacancyReport,
      VacancyViewEvent,
    ]),
    AuditModule,
    AuthModule,
    PermissionsModule,
    UsersModule,
    CompaniesModule,
  ],
  controllers: [
    CompanyVacanciesController,
    PublicVacanciesController,
    VacancyReportsController,
    AdminVacancyReportsController,
  ],
  providers: [
    { provide: VACANCY_REPOSITORY, useClass: VacancyRepository },
    {
      provide: VACANCY_QUESTION_REPOSITORY,
      useClass: VacancyQuestionRepository,
    },
    { provide: VACANCY_REPORT_REPOSITORY, useClass: VacancyReportRepository },
    {
      provide: VACANCY_VIEW_EVENT_REPOSITORY,
      useClass: VacancyViewEventRepository,
    },
    VacancyOwnershipService,
    CompanyVacanciesUseCase,
    VacancyStatusUseCase,
    PublicVacanciesUseCase,
    VacancyQuestionsUseCase,
    VacancyReportsUseCase,
    // Jobs sin endpoint, invocados por los scripts de cron:
    // `vacancies:expire` (T20) y `views:consolidate` (T18).
    ExpireVacanciesUseCase,
    ConsolidateVacancyViewsUseCase,
  ],
  // `VacancyOwnershipService` lo reutiliza M11 (postulaciones) para resolver la
  // empresa del reclutador y validar que la vacante es suya. Las preguntas de
  // filtrado (M15) las lee M11 para calcular el puntaje al postular.
  exports: [
    VACANCY_REPOSITORY,
    VACANCY_QUESTION_REPOSITORY,
    VacancyOwnershipService,
  ],
})
export class VacanciesModule {}
