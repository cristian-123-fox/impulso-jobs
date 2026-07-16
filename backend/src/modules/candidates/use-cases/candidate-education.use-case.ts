import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { Role } from '@/common/types/role.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { CandidateEducation } from '@/modules/candidates/entities/candidate-education.entity';
import {
  type ICandidateEducationRepository,
  CANDIDATE_EDUCATION_REPOSITORY,
} from '@/modules/candidates/repositories/candidate-education.repository.interface';
import {
  type ICandidateProfileRepository,
  CANDIDATE_PROFILE_REPOSITORY,
} from '@/modules/candidates/repositories/candidate-profile.repository.interface';

export interface CandidateEducationCommand {
  id?: string;
  userId: string;
  role: Role;
  institutionName: string;
  educationLevel: string;
  degreeName: string;
  fieldOfStudy?: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  description?: string;
  ip: string;
  userAgent: string;
}

@Injectable()
export class CandidateEducationUseCase {
  constructor(
    @Inject(CANDIDATE_PROFILE_REPOSITORY)
    private readonly profiles: ICandidateProfileRepository,
    @Inject(CANDIDATE_EDUCATION_REPOSITORY)
    private readonly educations: ICandidateEducationRepository,
    private readonly audit: AuditService,
  ) {}

  async list(userId: string, role: Role): Promise<CandidateEducation[]> {
    const profileId = await this.requireProfileId(userId, role);
    return this.educations.findByProfileId(profileId);
  }

  async save(command: CandidateEducationCommand): Promise<CandidateEducation> {
    const profileId = await this.requireProfileId(command.userId, command.role);
    this.assertDateRange(command.startDate, command.endDate, command.isCurrent);

    const education = command.id
      ? await this.requireEducation(command.id, profileId)
      : new CandidateEducation();

    education.candidateProfileId = profileId;
    education.institutionName = command.institutionName.trim();
    education.educationLevel = command.educationLevel;
    education.degreeName = command.degreeName.trim();
    education.fieldOfStudy = command.fieldOfStudy?.trim() || null;
    education.startDate = command.startDate;
    education.endDate = command.isCurrent ? null : command.endDate?.trim() || null;
    education.isCurrent = command.isCurrent;
    education.description = command.description?.trim() || null;

    const saved = await this.educations.save(education);
    await this.audit.record({
      action: command.id ? 'candidate.education.update' : 'candidate.education.create',
      actorUserId: command.userId,
      entity: 'candidate_education',
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
    const education = await this.requireEducation(id, profileId);
    await this.educations.remove(education);
    await this.audit.record({
      action: 'candidate.education.delete',
      actorUserId: userId,
      entity: 'candidate_education',
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

  private async requireEducation(
    id: string,
    profileId: string,
  ): Promise<CandidateEducation> {
    const education = await this.educations.findByIdAndProfileId(id, profileId);
    if (!education) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.CANDIDATE_RESOURCE_NOT_FOUND,
        'La educación no existe o no pertenece al candidato autenticado.',
      );
    }
    return education;
  }

  private assertCandidateRole(role: Role): void {
    if (role !== Role.CANDIDATE) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        ErrorCode.FORBIDDEN,
        'Solo los candidatos pueden gestionar su educación.',
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
    if (!end || Number.isNaN(end.getTime()) || end.getTime() < start.getTime()) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.CANDIDATE_INVALID_DATE_RANGE,
        'La fecha de fin debe ser igual o posterior a la fecha de inicio.',
      );
    }
  }
}
