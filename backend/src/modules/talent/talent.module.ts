import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '@/modules/audit/audit.module';
import { CandidateProfile } from '@/modules/candidates/entities/candidate-profile.entity';
import { CandidatesModule } from '@/modules/candidates/candidates.module';
import { CompaniesModule } from '@/modules/companies/companies.module';
import { AuthModule } from '@/modules/iam/auth/auth.module';
import { PermissionsModule } from '@/modules/iam/permissions/permissions.module';
import { UsersModule } from '@/modules/iam/users/users.module';
import { CompanyCandidatesController } from '@/modules/talent/controllers/company-candidates.controller';
import { TalentAccessGrant } from '@/modules/talent/entities/talent-access-grant.entity';
import { TalentAccessView } from '@/modules/talent/entities/talent-access-view.entity';
import { CANDIDATE_SEARCH_REPOSITORY } from '@/modules/talent/repositories/candidate-search.repository.interface';
import { CandidateSearchRepository } from '@/modules/talent/repositories/candidate-search.repository';
import { TALENT_ACCESS_REPOSITORY } from '@/modules/talent/repositories/talent-access.repository.interface';
import { TalentAccessRepository } from '@/modules/talent/repositories/talent-access.repository';
import { TalentQuotaService } from '@/modules/talent/services/talent-quota.service';
import { CandidateSearchUseCase } from '@/modules/talent/use-cases/candidate-search.use-case';
import { VacanciesModule } from '@/modules/vacancies/vacancies.module';

/**
 * M12: banco de talento. Búsqueda de candidatos por parte de la empresa y
 * consumo del cupo de visitas.
 *
 * Va en su propio módulo y no dentro de `candidates/` porque es la cara
 * **empresa** del dominio: `candidates/` es el autoservicio del aspirante
 * sobre sus propios datos, mientras que aquí vive la búsqueda de terceros y el
 * cupo comprado. M14 (billing) creará los `talent_access_grants` llamando a
 * `TALENT_ACCESS_REPOSITORY`, que se exporta para eso.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      CandidateProfile,
      TalentAccessGrant,
      TalentAccessView,
    ]),
    AuditModule,
    AuthModule,
    PermissionsModule,
    UsersModule,
    CandidatesModule,
    CompaniesModule,
    VacanciesModule,
  ],
  controllers: [CompanyCandidatesController],
  providers: [
    {
      provide: CANDIDATE_SEARCH_REPOSITORY,
      useClass: CandidateSearchRepository,
    },
    { provide: TALENT_ACCESS_REPOSITORY, useClass: TalentAccessRepository },
    TalentQuotaService,
    CandidateSearchUseCase,
  ],
  exports: [TALENT_ACCESS_REPOSITORY, TalentQuotaService],
})
export class TalentModule {}
