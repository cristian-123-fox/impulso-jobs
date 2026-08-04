import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '@/modules/audit/audit.module';
import { CompaniesModule } from '@/modules/companies/companies.module';
import { AuthModule } from '@/modules/iam/auth/auth.module';
import { PermissionsModule } from '@/modules/iam/permissions/permissions.module';
import { UsersModule } from '@/modules/iam/users/users.module';
import { CompanyVacanciesController } from '@/modules/vacancies/controllers/company-vacancies.controller';
import { PublicVacanciesController } from '@/modules/vacancies/controllers/public-vacancies.controller';
import { Vacancy } from '@/modules/vacancies/entities/vacancy.entity';
import { VACANCY_REPOSITORY } from '@/modules/vacancies/repositories/vacancy.repository.interface';
import { VacancyRepository } from '@/modules/vacancies/repositories/vacancy.repository';
import { VacancyOwnershipService } from '@/modules/vacancies/services/vacancy-ownership.service';
import { CompanyVacanciesUseCase } from '@/modules/vacancies/use-cases/company-vacancies.use-case';
import { PublicVacanciesUseCase } from '@/modules/vacancies/use-cases/public-vacancies.use-case';
import { VacancyStatusUseCase } from '@/modules/vacancies/use-cases/vacancy-status.use-case';

/** M10: vacantes de la empresa y portal público de empleo. */
@Module({
  imports: [
    TypeOrmModule.forFeature([Vacancy]),
    AuditModule,
    AuthModule,
    PermissionsModule,
    UsersModule,
    CompaniesModule,
  ],
  controllers: [CompanyVacanciesController, PublicVacanciesController],
  providers: [
    { provide: VACANCY_REPOSITORY, useClass: VacancyRepository },
    VacancyOwnershipService,
    CompanyVacanciesUseCase,
    VacancyStatusUseCase,
    PublicVacanciesUseCase,
  ],
  exports: [VACANCY_REPOSITORY],
})
export class VacanciesModule {}
