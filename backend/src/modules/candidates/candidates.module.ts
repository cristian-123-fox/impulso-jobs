import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CandidateProfile } from '@/modules/candidates/entities/candidate-profile.entity';
import { CANDIDATE_PROFILE_REPOSITORY } from '@/modules/candidates/repositories/candidate-profile.repository.interface';
import { CandidateProfileRepository } from '@/modules/candidates/repositories/candidate-profile.repository';

/** Dominio de candidatos: perfil y su repositorio. */
@Module({
  imports: [TypeOrmModule.forFeature([CandidateProfile])],
  providers: [
    {
      provide: CANDIDATE_PROFILE_REPOSITORY,
      useClass: CandidateProfileRepository,
    },
  ],
  exports: [CANDIDATE_PROFILE_REPOSITORY],
})
export class CandidatesModule {}
