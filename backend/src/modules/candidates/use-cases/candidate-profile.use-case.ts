import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { Role } from '@/common/types/role.enum';
import { ErrorCode } from '@/common/types/error-code.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { CandidateProfile } from '@/modules/candidates/entities/candidate-profile.entity';
import { Language } from '@/modules/candidates/entities/language.entity';
import {
  type ICandidateEducationRepository,
  CANDIDATE_EDUCATION_REPOSITORY,
} from '@/modules/candidates/repositories/candidate-education.repository.interface';
import {
  type ICandidateExperienceRepository,
  CANDIDATE_EXPERIENCE_REPOSITORY,
} from '@/modules/candidates/repositories/candidate-experience.repository.interface';
import {
  type ICandidateLanguageRepository,
  CANDIDATE_LANGUAGE_REPOSITORY,
} from '@/modules/candidates/repositories/candidate-language.repository.interface';
import {
  type ICandidateProfileRepository,
  CANDIDATE_PROFILE_REPOSITORY,
} from '@/modules/candidates/repositories/candidate-profile.repository.interface';
import {
  type ICandidateSkillRepository,
  CANDIDATE_SKILL_REPOSITORY,
} from '@/modules/candidates/repositories/candidate-skill.repository.interface';
import {
  type ICandidateResumeRepository,
  CANDIDATE_RESUME_REPOSITORY,
} from '@/modules/candidates/repositories/candidate-resume.repository.interface';
import {
  type ILanguageRepository,
  LANGUAGE_REPOSITORY,
} from '@/modules/candidates/repositories/language.repository.interface';
import {
  type IUserRepository,
  USER_REPOSITORY,
} from '@/modules/iam/users/repositories/user.repository.interface';

export interface CandidateActor {
  userId: string;
  role: Role;
  ip: string;
  userAgent: string;
}

export interface UpdateCandidateProfileCommand extends CandidateActor {
  firstName: string;
  lastName: string;
  professionalTitle?: string;
  summary?: string;
  address?: string;
  country: string;
  state: string;
  municipality: string;
  birthDate: string;
}

export interface UpdateCandidatePhotoCommand extends CandidateActor {
  profilePhotoUrl?: string | null;
}

@Injectable()
export class CandidateProfileUseCase {
  constructor(
    @Inject(CANDIDATE_PROFILE_REPOSITORY)
    private readonly profiles: ICandidateProfileRepository,
    @Inject(CANDIDATE_EXPERIENCE_REPOSITORY)
    private readonly experiences: ICandidateExperienceRepository,
    @Inject(CANDIDATE_EDUCATION_REPOSITORY)
    private readonly educations: ICandidateEducationRepository,
    @Inject(CANDIDATE_LANGUAGE_REPOSITORY)
    private readonly languages: ICandidateLanguageRepository,
    @Inject(CANDIDATE_SKILL_REPOSITORY)
    private readonly skills: ICandidateSkillRepository,
    @Inject(CANDIDATE_RESUME_REPOSITORY)
    private readonly resumes: ICandidateResumeRepository,
    @Inject(LANGUAGE_REPOSITORY)
    private readonly languageCatalog: ILanguageRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: IUserRepository,
    private readonly audit: AuditService,
  ) {}

  async getProfile(userId: string, role: Role): Promise<{
    profile: CandidateProfile;
    email: string;
    completion: number;
  }> {
    this.assertCandidateRole(role);
    const profile = await this.requireProfile(userId);
    const user = await this.users.findById(userId);
    if (!user) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.USER_NOT_FOUND,
        'El usuario no existe.',
      );
    }

    return {
      profile,
      email: user.email,
      completion: await this.calculateCompletion(profile.id, profile),
    };
  }

  async updateProfile(command: UpdateCandidateProfileCommand): Promise<{
    profile: CandidateProfile;
    email: string;
    completion: number;
  }> {
    this.assertCandidateRole(command.role);
    const profile = await this.requireProfile(command.userId);
    this.assertNotFutureDate(command.birthDate, 'La fecha de nacimiento no puede ser futura.');

    profile.firstName = command.firstName.trim();
    profile.lastName = command.lastName.trim();
    profile.professionalTitle = command.professionalTitle?.trim() || null;
    profile.summary = command.summary?.trim() || null;
    profile.address = command.address?.trim() || null;
    profile.country = command.country.trim().toUpperCase();
    profile.state = command.state.trim().toUpperCase();
    profile.municipality = command.municipality.trim();
    profile.birthDate = command.birthDate;

    const saved = await this.profiles.save(profile);
    const user = await this.users.findById(command.userId);
    await this.audit.record({
      action: 'candidate.profile.update',
      actorUserId: command.userId,
      entity: 'candidate_profile',
      entityId: saved.id,
      ip: command.ip,
      userAgent: command.userAgent,
    });

    return {
      profile: saved,
      email: user?.email ?? '',
      completion: await this.calculateCompletion(saved.id, saved),
    };
  }

  async updatePhoto(command: UpdateCandidatePhotoCommand): Promise<CandidateProfile> {
    this.assertCandidateRole(command.role);
    const profile = await this.requireProfile(command.userId);
    profile.profilePhotoUrl = command.profilePhotoUrl?.trim() || null;
    const saved = await this.profiles.save(profile);
    await this.audit.record({
      action: 'candidate.profile.photo.update',
      actorUserId: command.userId,
      entity: 'candidate_profile',
      entityId: saved.id,
      ip: command.ip,
      userAgent: command.userAgent,
    });
    return saved;
  }

  listCatalogLanguages(): Promise<Language[]> {
    return this.languageCatalog.findAll();
  }

  private async requireProfile(userId: string): Promise<CandidateProfile> {
    const profile = await this.profiles.findByUserId(userId);
    if (!profile) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.CANDIDATE_PROFILE_NOT_FOUND,
        'No existe un perfil de candidato para este usuario.',
      );
    }
    return profile;
  }

  private async calculateCompletion(
    profileId: string,
    profile: CandidateProfile,
  ): Promise<number> {
    const checks = [
      Boolean(profile.firstName?.trim()),
      Boolean(profile.lastName?.trim()),
      Boolean(profile.professionalTitle?.trim()),
      Boolean(profile.summary?.trim()),
      Boolean(profile.address?.trim()),
      Boolean(profile.profilePhotoUrl?.trim()),
      (await this.experiences.countByProfileId(profileId)) > 0,
      (await this.educations.countByProfileId(profileId)) > 0,
      (await this.languages.countByProfileId(profileId)) > 0,
      (await this.skills.countByProfileId(profileId)) > 0,
      (await this.resumes.countByProfileId(profileId)) > 0,
    ];
    const completed = checks.filter(Boolean).length;
    return Math.round((completed / checks.length) * 100);
  }

  private assertCandidateRole(role: Role): void {
    if (role !== Role.CANDIDATE) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        ErrorCode.FORBIDDEN,
        'Solo los candidatos pueden gestionar este perfil.',
      );
    }
  }

  private assertNotFutureDate(value: string, message: string): void {
    const date = new Date(value);
    if (Number.isNaN(date.getTime()) || date.getTime() > Date.now()) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.CANDIDATE_DATE_IN_FUTURE,
        message,
      );
    }
  }
}
