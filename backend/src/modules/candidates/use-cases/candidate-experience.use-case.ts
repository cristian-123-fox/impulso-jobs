import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { Role } from '@/common/types/role.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { CandidateExperience } from '@/modules/candidates/entities/candidate-experience.entity';
import {
  type ICandidateExperienceRepository,
  CANDIDATE_EXPERIENCE_REPOSITORY,
} from '@/modules/candidates/repositories/candidate-experience.repository.interface';
import {
  type ICandidateProfileRepository,
  CANDIDATE_PROFILE_REPOSITORY,
} from '@/modules/candidates/repositories/candidate-profile.repository.interface';

export interface CandidateExperienceCommand {
  id?: string;
  userId: string;
  role: Role;
  jobTitle: string;
  companyName: string;
  location: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  responsibilities?: string;
  ip: string;
  userAgent: string;
}

@Injectable()
export class CandidateExperienceUseCase {
  constructor(
    @Inject(CANDIDATE_PROFILE_REPOSITORY)
    private readonly profiles: ICandidateProfileRepository,
    @Inject(CANDIDATE_EXPERIENCE_REPOSITORY)
    private readonly experiences: ICandidateExperienceRepository,
    private readonly audit: AuditService,
  ) {}

  async list(userId: string, role: Role): Promise<CandidateExperience[]> {
    const profileId = await this.requireProfileId(userId, role);
    return this.experiences.findByProfileId(profileId);
  }

  async save(
    command: CandidateExperienceCommand,
  ): Promise<CandidateExperience> {
    const profileId = await this.requireProfileId(command.userId, command.role);
    this.assertDateRange(command.startDate, command.endDate, command.isCurrent);

    const experience = command.id
      ? await this.requireExperience(command.id, profileId)
      : new CandidateExperience();

    experience.candidateProfileId = profileId;
    experience.jobTitle = command.jobTitle.trim();
    experience.companyName = command.companyName.trim();
    experience.location = command.location.trim();
    experience.startDate = command.startDate;
    experience.isCurrent = command.isCurrent;
    experience.endDate = command.isCurrent
      ? null
      : command.endDate?.trim() || null;
    experience.responsibilities = command.responsibilities?.trim() || null;

    const saved = await this.experiences.save(experience);
    await this.audit.record({
      action: command.id
        ? 'candidate.experience.update'
        : 'candidate.experience.create',
      actorUserId: command.userId,
      entity: 'candidate_experience',
      entityId: saved.id,
      ip: command.ip,
      userAgent: command.userAgent,
    });
    return saved;
  }

  async remove(
    id: string,
    userId: string,
    role: Role,
    ip: string,
    userAgent: string,
  ): Promise<void> {
    const profileId = await this.requireProfileId(userId, role);
    const experience = await this.requireExperience(id, profileId);
    await this.experiences.remove(experience);
    await this.audit.record({
      action: 'candidate.experience.delete',
      actorUserId: userId,
      entity: 'candidate_experience',
      entityId: id,
      ip,
      userAgent,
    });
  }

  private async requireProfileId(userId: string, role: Role): Promise<string> {
    this.assertCandidateRole(role);
    const profile = await this.profiles.findByUserId(userId);
    if (!profile) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.CANDIDATE_PROFILE_NOT_FOUND,
        'No existe un perfil de candidato para este usuario.',
      );
    }
    return profile.id;
  }

  private async requireExperience(
    id: string,
    profileId: string,
  ): Promise<CandidateExperience> {
    const experience = await this.experiences.findByIdAndProfileId(
      id,
      profileId,
    );
    if (!experience) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.CANDIDATE_RESOURCE_NOT_FOUND,
        'La experiencia no existe o no pertenece al candidato autenticado.',
      );
    }
    return experience;
  }

  private assertCandidateRole(role: Role): void {
    if (role !== Role.CANDIDATE) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        ErrorCode.FORBIDDEN,
        'Solo los candidatos pueden gestionar su experiencia.',
      );
    }
  }

  private assertDateRange(
    startDate: string,
    endDate: string | undefined,
    isCurrent: boolean,
  ): void {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;
    const today = Date.now();
    if (Number.isNaN(start.getTime()) || start.getTime() > today) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.CANDIDATE_DATE_IN_FUTURE,
        'La fecha de inicio no puede ser futura.',
      );
    }
    if (isCurrent) return;
    if (
      !end ||
      Number.isNaN(end.getTime()) ||
      end.getTime() < start.getTime()
    ) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.CANDIDATE_INVALID_DATE_RANGE,
        'La fecha de fin debe ser igual o posterior a la fecha de inicio.',
      );
    }
  }
}
