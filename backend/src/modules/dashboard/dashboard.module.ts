import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationsModule } from '@/modules/applications/applications.module';
import { CandidateApplication } from '@/modules/applications/entities/candidate-application.entity';
import { PromotionOrder } from '@/modules/billing/entities/promotion-order.entity';
import { CandidateEducation } from '@/modules/candidates/entities/candidate-education.entity';
import { CandidateExperience } from '@/modules/candidates/entities/candidate-experience.entity';
import { CandidateLanguage } from '@/modules/candidates/entities/candidate-language.entity';
import { CandidateProfile } from '@/modules/candidates/entities/candidate-profile.entity';
import { CandidateResume } from '@/modules/candidates/entities/candidate-resume.entity';
import { CandidateSkill } from '@/modules/candidates/entities/candidate-skill.entity';
import { SavedVacancy } from '@/modules/candidates/entities/saved-vacancy.entity';
import { CompaniesModule } from '@/modules/companies/companies.module';
import { Company } from '@/modules/companies/entities/company.entity';
import { AuthModule } from '@/modules/iam/auth/auth.module';
import { PermissionsModule } from '@/modules/iam/permissions/permissions.module';
import { User } from '@/modules/iam/users/entities/user.entity';
import { TalentModule } from '@/modules/talent/talent.module';
import { TalentAccessView } from '@/modules/talent/entities/talent-access-view.entity';
import { VacanciesModule } from '@/modules/vacancies/vacancies.module';
import { Vacancy } from '@/modules/vacancies/entities/vacancy.entity';
import { VacancyReport } from '@/modules/vacancies/entities/vacancy-report.entity';
import { AdminDashboardController } from '@/modules/dashboard/controllers/admin-dashboard.controller';
import { CandidateDashboardController } from '@/modules/dashboard/controllers/candidate-dashboard.controller';
import { CompanyDashboardController } from '@/modules/dashboard/controllers/company-dashboard.controller';
import { ADMIN_DASHBOARD_REPOSITORY } from '@/modules/dashboard/repositories/admin-dashboard.repository.interface';
import { AdminDashboardRepository } from '@/modules/dashboard/repositories/admin-dashboard.repository';
import { CANDIDATE_DASHBOARD_REPOSITORY } from '@/modules/dashboard/repositories/candidate-dashboard.repository.interface';
import { CandidateDashboardRepository } from '@/modules/dashboard/repositories/candidate-dashboard.repository';
import { COMPANY_DASHBOARD_REPOSITORY } from '@/modules/dashboard/repositories/company-dashboard.repository.interface';
import { CompanyDashboardRepository } from '@/modules/dashboard/repositories/company-dashboard.repository';
import { AdminDashboardUseCase } from '@/modules/dashboard/use-cases/admin-dashboard.use-case';
import { CandidateDashboardUseCase } from '@/modules/dashboard/use-cases/candidate-dashboard.use-case';
import { CompanyDashboardUseCase } from '@/modules/dashboard/use-cases/company-dashboard.use-case';

/**
 * Paneles de inicio de las tres áreas.
 *
 * Es un módulo **consumidor**: importa a los demás y nadie lo importa a él, así
 * que puede cruzar dominios (usuarios + empresas + vacantes + postulaciones +
 * talento + cobros) sin riesgo de cerrar un ciclo de DI. Es la razón de que
 * exista en vez de colgar cada endpoint de su módulo "natural", que sí los
 * cerrarían.
 *
 * Los agregados van por repositorios propios sobre las **entidades**: los
 * repositorios de cada módulo están hechos para listar y paginar, no para
 * `GROUP BY`. Importar una clase de entidad no crea ciclo; importar su módulo,
 * sí — el mismo patrón que `ICompanyPlanRepository`.
 *
 * De los módulos ajenos sólo se toman tres servicios que ya resuelven reglas
 * que no conviene duplicar: la empresa de la sesión, el catálogo de estados de
 * postulación y el cupo de talento.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      // Empresa
      Vacancy,
      CandidateApplication,
      // Back-office
      User,
      Company,
      VacancyReport,
      PromotionOrder,
      // Aspirante
      CandidateProfile,
      CandidateExperience,
      CandidateEducation,
      CandidateLanguage,
      CandidateSkill,
      CandidateResume,
      SavedVacancy,
      TalentAccessView,
    ]),
    AuthModule,
    PermissionsModule,
    VacanciesModule,
    ApplicationsModule,
    CompaniesModule,
    TalentModule,
  ],
  controllers: [
    CompanyDashboardController,
    AdminDashboardController,
    CandidateDashboardController,
  ],
  providers: [
    {
      provide: COMPANY_DASHBOARD_REPOSITORY,
      useClass: CompanyDashboardRepository,
    },
    { provide: ADMIN_DASHBOARD_REPOSITORY, useClass: AdminDashboardRepository },
    {
      provide: CANDIDATE_DASHBOARD_REPOSITORY,
      useClass: CandidateDashboardRepository,
    },
    CompanyDashboardUseCase,
    AdminDashboardUseCase,
    CandidateDashboardUseCase,
  ],
})
export class DashboardModule {}
