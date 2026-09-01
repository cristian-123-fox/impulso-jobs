import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CandidateApplicationsController } from '@/modules/applications/controllers/candidate-applications.controller';
import { CompanyApplicationsController } from '@/modules/applications/controllers/company-applications.controller';
import { ApplicationAnswer } from '@/modules/applications/entities/application-answer.entity';
import { ApplicationStatusHistory } from '@/modules/applications/entities/application-status-history.entity';
import { ApplicationStatus } from '@/modules/applications/entities/application-status.entity';
import { CandidateApplication } from '@/modules/applications/entities/candidate-application.entity';
import { APPLICATION_ANSWER_REPOSITORY } from '@/modules/applications/repositories/application-answer.repository.interface';
import { ApplicationAnswerRepository } from '@/modules/applications/repositories/application-answer.repository';
import { APPLICATION_STATUS_HISTORY_REPOSITORY } from '@/modules/applications/repositories/application-status-history.repository.interface';
import { ApplicationStatusHistoryRepository } from '@/modules/applications/repositories/application-status-history.repository';
import { APPLICATION_STATUS_REPOSITORY } from '@/modules/applications/repositories/application-status.repository.interface';
import { ApplicationStatusRepository } from '@/modules/applications/repositories/application-status.repository';
import { CANDIDATE_APPLICATION_REPOSITORY } from '@/modules/applications/repositories/candidate-application.repository.interface';
import { CandidateApplicationRepository } from '@/modules/applications/repositories/candidate-application.repository';
import { ApplicationOwnershipService } from '@/modules/applications/services/application-ownership.service';
import { APPLICATION_RESUME_SNAPSHOT_STORAGE } from '@/modules/applications/services/application-resume-snapshot-storage.port';
import { LocalApplicationResumeSnapshotStorageService } from '@/modules/applications/services/local-application-resume-snapshot-storage.service';
import { ApplicationStatusUseCase } from '@/modules/applications/use-cases/application-status.use-case';
import { CandidateApplicationsUseCase } from '@/modules/applications/use-cases/candidate-applications.use-case';
import { CompanyApplicationsUseCase } from '@/modules/applications/use-cases/company-applications.use-case';
import { AuditModule } from '@/modules/audit/audit.module';
import { CandidatesModule } from '@/modules/candidates/candidates.module';
import { CompaniesModule } from '@/modules/companies/companies.module';
import { AuthModule } from '@/modules/iam/auth/auth.module';
import { PermissionsModule } from '@/modules/iam/permissions/permissions.module';
import { UsersModule } from '@/modules/iam/users/users.module';
import { VacanciesModule } from '@/modules/vacancies/vacancies.module';

/** M11: postulaciones del aspirante y su gestión por parte de la empresa. */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      CandidateApplication,
      ApplicationStatus,
      ApplicationStatusHistory,
      ApplicationAnswer,
    ]),
    AuditModule,
    AuthModule,
    PermissionsModule,
    UsersModule,
    CandidatesModule,
    CompaniesModule,
    VacanciesModule,
  ],
  controllers: [CandidateApplicationsController, CompanyApplicationsController],
  providers: [
    {
      provide: CANDIDATE_APPLICATION_REPOSITORY,
      useClass: CandidateApplicationRepository,
    },
    {
      provide: APPLICATION_STATUS_REPOSITORY,
      useClass: ApplicationStatusRepository,
    },
    {
      provide: APPLICATION_STATUS_HISTORY_REPOSITORY,
      useClass: ApplicationStatusHistoryRepository,
    },
    {
      provide: APPLICATION_ANSWER_REPOSITORY,
      useClass: ApplicationAnswerRepository,
    },
    // T19: snapshot del CV por postulación (local; migrar a S3 = cambiar
    // el useClass, mismo patrón que CANDIDATE_RESUME_STORAGE).
    {
      provide: APPLICATION_RESUME_SNAPSHOT_STORAGE,
      useClass: LocalApplicationResumeSnapshotStorageService,
    },
    ApplicationOwnershipService,
    CandidateApplicationsUseCase,
    CompanyApplicationsUseCase,
    ApplicationStatusUseCase,
  ],
  // M13 (export ARCO) lee postulaciones e historial; M16 (aviso a no
  // seleccionados) leerá las postulaciones al cerrar una vacante.
  exports: [
    CANDIDATE_APPLICATION_REPOSITORY,
    APPLICATION_STATUS_REPOSITORY,
    APPLICATION_STATUS_HISTORY_REPOSITORY,
  ],
})
export class ApplicationsModule {}
