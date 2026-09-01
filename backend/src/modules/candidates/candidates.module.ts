import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocalPublicFileStorageAdapter } from '@/common/storage/local-public-file-storage.adapter';
import { PUBLIC_FILE_STORAGE } from '@/common/storage/public-file-storage.port';
import { AuditModule } from '@/modules/audit/audit.module';
import { CandidateProfileController } from '@/modules/candidates/controllers/candidate-profile.controller';
import { CandidateResumeController } from '@/modules/candidates/controllers/candidate-resume.controller';
import { CandidateSavedVacanciesController } from '@/modules/candidates/controllers/candidate-saved-vacancies.controller';
import { CandidateSettingsController } from '@/modules/candidates/controllers/candidate-settings.controller';
import { CandidateEducation } from '@/modules/candidates/entities/candidate-education.entity';
import { CandidateExperience } from '@/modules/candidates/entities/candidate-experience.entity';
import { CandidateLanguage } from '@/modules/candidates/entities/candidate-language.entity';
import { CandidateProfile } from '@/modules/candidates/entities/candidate-profile.entity';
import { CandidateProfileSettings } from '@/modules/candidates/entities/candidate-profile-settings.entity';
import { CandidateResume } from '@/modules/candidates/entities/candidate-resume.entity';
import { CandidateSkill } from '@/modules/candidates/entities/candidate-skill.entity';
import { Language } from '@/modules/candidates/entities/language.entity';
import { SavedVacancy } from '@/modules/candidates/entities/saved-vacancy.entity';
import { CANDIDATE_EDUCATION_REPOSITORY } from '@/modules/candidates/repositories/candidate-education.repository.interface';
import { CandidateEducationRepository } from '@/modules/candidates/repositories/candidate-education.repository';
import { CANDIDATE_EXPERIENCE_REPOSITORY } from '@/modules/candidates/repositories/candidate-experience.repository.interface';
import { CandidateExperienceRepository } from '@/modules/candidates/repositories/candidate-experience.repository';
import { CANDIDATE_LANGUAGE_REPOSITORY } from '@/modules/candidates/repositories/candidate-language.repository.interface';
import { CandidateLanguageRepository } from '@/modules/candidates/repositories/candidate-language.repository';
import { CANDIDATE_PROFILE_REPOSITORY } from '@/modules/candidates/repositories/candidate-profile.repository.interface';
import { CandidateProfileRepository } from '@/modules/candidates/repositories/candidate-profile.repository';
import { CANDIDATE_PROFILE_SETTINGS_REPOSITORY } from '@/modules/candidates/repositories/candidate-profile-settings.repository.interface';
import { CandidateProfileSettingsRepository } from '@/modules/candidates/repositories/candidate-profile-settings.repository';
import { CANDIDATE_RESUME_REPOSITORY } from '@/modules/candidates/repositories/candidate-resume.repository.interface';
import { CandidateResumeRepository } from '@/modules/candidates/repositories/candidate-resume.repository';
import { CANDIDATE_SKILL_REPOSITORY } from '@/modules/candidates/repositories/candidate-skill.repository.interface';
import { CandidateSkillRepository } from '@/modules/candidates/repositories/candidate-skill.repository';
import { LANGUAGE_REPOSITORY } from '@/modules/candidates/repositories/language.repository.interface';
import { LanguageRepository } from '@/modules/candidates/repositories/language.repository';
import { SAVED_VACANCY_REPOSITORY } from '@/modules/candidates/repositories/saved-vacancy.repository.interface';
import { SavedVacancyRepository } from '@/modules/candidates/repositories/saved-vacancy.repository';
import { CANDIDATE_RESUME_STORAGE } from '@/modules/candidates/services/candidate-resume-storage.port';
import { LocalCandidateResumeStorageService } from '@/modules/candidates/services/local-candidate-resume-storage.service';
import { CandidateEducationUseCase } from '@/modules/candidates/use-cases/candidate-education.use-case';
import { CandidateExperienceUseCase } from '@/modules/candidates/use-cases/candidate-experience.use-case';
import { CandidateLanguageUseCase } from '@/modules/candidates/use-cases/candidate-language.use-case';
import { CandidateProfileUseCase } from '@/modules/candidates/use-cases/candidate-profile.use-case';
import { CandidateResumeUseCase } from '@/modules/candidates/use-cases/candidate-resume.use-case';
import { CandidateSettingsUseCase } from '@/modules/candidates/use-cases/candidate-settings.use-case';
import { CandidateSkillUseCase } from '@/modules/candidates/use-cases/candidate-skill.use-case';
import { SavedVacanciesUseCase } from '@/modules/candidates/use-cases/saved-vacancies.use-case';
import { CompaniesModule } from '@/modules/companies/companies.module';
import { AuthModule } from '@/modules/iam/auth/auth.module';
import { PermissionsModule } from '@/modules/iam/permissions/permissions.module';
import { UsersModule } from '@/modules/iam/users/users.module';
import { VacanciesModule } from '@/modules/vacancies/vacancies.module';

/** Dominio de candidatos: perfil y su repositorio. */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      CandidateProfile,
      CandidateProfileSettings,
      CandidateExperience,
      CandidateEducation,
      CandidateLanguage,
      CandidateSkill,
      CandidateResume,
      Language,
      SavedVacancy,
    ]),
    AuditModule,
    AuthModule,
    PermissionsModule,
    UsersModule,
    // T17: las guardadas listan la vista pública de la vacante y su empresa.
    VacanciesModule,
    CompaniesModule,
  ],
  controllers: [
    CandidateProfileController,
    CandidateResumeController,
    CandidateSavedVacanciesController,
    CandidateSettingsController,
  ],
  providers: [
    {
      provide: CANDIDATE_PROFILE_REPOSITORY,
      useClass: CandidateProfileRepository,
    },
    {
      provide: CANDIDATE_PROFILE_SETTINGS_REPOSITORY,
      useClass: CandidateProfileSettingsRepository,
    },
    {
      provide: CANDIDATE_EXPERIENCE_REPOSITORY,
      useClass: CandidateExperienceRepository,
    },
    {
      provide: CANDIDATE_EDUCATION_REPOSITORY,
      useClass: CandidateEducationRepository,
    },
    {
      provide: CANDIDATE_LANGUAGE_REPOSITORY,
      useClass: CandidateLanguageRepository,
    },
    {
      provide: CANDIDATE_SKILL_REPOSITORY,
      useClass: CandidateSkillRepository,
    },
    {
      provide: CANDIDATE_RESUME_REPOSITORY,
      useClass: CandidateResumeRepository,
    },
    {
      provide: LANGUAGE_REPOSITORY,
      useClass: LanguageRepository,
    },
    {
      provide: SAVED_VACANCY_REPOSITORY,
      useClass: SavedVacancyRepository,
    },
    {
      provide: CANDIDATE_RESUME_STORAGE,
      useClass: LocalCandidateResumeStorageService,
    },
    // Foto de perfil en disco local (decisión cPanel). Migrar a S3 = cambiar
    // este useClass, mismo patrón que MAILER_PORT / PAYMENT_PROVIDER.
    {
      provide: PUBLIC_FILE_STORAGE,
      useClass: LocalPublicFileStorageAdapter,
    },
    CandidateProfileUseCase,
    CandidateExperienceUseCase,
    CandidateEducationUseCase,
    CandidateLanguageUseCase,
    CandidateSkillUseCase,
    CandidateResumeUseCase,
    CandidateSettingsUseCase,
    SavedVacanciesUseCase,
  ],
  exports: [
    CANDIDATE_PROFILE_REPOSITORY,
    CANDIDATE_PROFILE_SETTINGS_REPOSITORY,
    CANDIDATE_EXPERIENCE_REPOSITORY,
    CANDIDATE_EDUCATION_REPOSITORY,
    CANDIDATE_LANGUAGE_REPOSITORY,
    CANDIDATE_SKILL_REPOSITORY,
    CANDIDATE_RESUME_REPOSITORY,
    // M11: la empresa descarga el CV adjunto a una postulación.
    CANDIDATE_RESUME_STORAGE,
    LANGUAGE_REPOSITORY,
  ],
})
export class CandidatesModule {}
