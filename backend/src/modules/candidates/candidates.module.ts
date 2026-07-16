import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '@/modules/audit/audit.module';
import { CandidateProfileController } from '@/modules/candidates/controllers/candidate-profile.controller';
import { CandidateEducation } from '@/modules/candidates/entities/candidate-education.entity';
import { CandidateExperience } from '@/modules/candidates/entities/candidate-experience.entity';
import { CandidateLanguage } from '@/modules/candidates/entities/candidate-language.entity';
import { CandidateProfile } from '@/modules/candidates/entities/candidate-profile.entity';
import { CandidateSkill } from '@/modules/candidates/entities/candidate-skill.entity';
import { Language } from '@/modules/candidates/entities/language.entity';
import { CANDIDATE_EDUCATION_REPOSITORY } from '@/modules/candidates/repositories/candidate-education.repository.interface';
import { CandidateEducationRepository } from '@/modules/candidates/repositories/candidate-education.repository';
import { CANDIDATE_EXPERIENCE_REPOSITORY } from '@/modules/candidates/repositories/candidate-experience.repository.interface';
import { CandidateExperienceRepository } from '@/modules/candidates/repositories/candidate-experience.repository';
import { CANDIDATE_LANGUAGE_REPOSITORY } from '@/modules/candidates/repositories/candidate-language.repository.interface';
import { CandidateLanguageRepository } from '@/modules/candidates/repositories/candidate-language.repository';
import { CANDIDATE_PROFILE_REPOSITORY } from '@/modules/candidates/repositories/candidate-profile.repository.interface';
import { CandidateProfileRepository } from '@/modules/candidates/repositories/candidate-profile.repository';
import { CANDIDATE_SKILL_REPOSITORY } from '@/modules/candidates/repositories/candidate-skill.repository.interface';
import { CandidateSkillRepository } from '@/modules/candidates/repositories/candidate-skill.repository';
import { LANGUAGE_REPOSITORY } from '@/modules/candidates/repositories/language.repository.interface';
import { LanguageRepository } from '@/modules/candidates/repositories/language.repository';
import { CandidateEducationUseCase } from '@/modules/candidates/use-cases/candidate-education.use-case';
import { CandidateExperienceUseCase } from '@/modules/candidates/use-cases/candidate-experience.use-case';
import { CandidateLanguageUseCase } from '@/modules/candidates/use-cases/candidate-language.use-case';
import { CandidateProfileUseCase } from '@/modules/candidates/use-cases/candidate-profile.use-case';
import { CandidateSkillUseCase } from '@/modules/candidates/use-cases/candidate-skill.use-case';
import { AuthModule } from '@/modules/iam/auth/auth.module';
import { PermissionsModule } from '@/modules/iam/permissions/permissions.module';
import { UsersModule } from '@/modules/iam/users/users.module';

/** Dominio de candidatos: perfil y su repositorio. */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      CandidateProfile,
      CandidateExperience,
      CandidateEducation,
      CandidateLanguage,
      CandidateSkill,
      Language,
    ]),
    AuditModule,
    AuthModule,
    PermissionsModule,
    UsersModule,
  ],
  controllers: [CandidateProfileController],
  providers: [
    {
      provide: CANDIDATE_PROFILE_REPOSITORY,
      useClass: CandidateProfileRepository,
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
      provide: LANGUAGE_REPOSITORY,
      useClass: LanguageRepository,
    },
    CandidateProfileUseCase,
    CandidateExperienceUseCase,
    CandidateEducationUseCase,
    CandidateLanguageUseCase,
    CandidateSkillUseCase,
  ],
  exports: [
    CANDIDATE_PROFILE_REPOSITORY,
    CANDIDATE_EXPERIENCE_REPOSITORY,
    CANDIDATE_EDUCATION_REPOSITORY,
    CANDIDATE_LANGUAGE_REPOSITORY,
    CANDIDATE_SKILL_REPOSITORY,
    LANGUAGE_REPOSITORY,
  ],
})
export class CandidatesModule {}
