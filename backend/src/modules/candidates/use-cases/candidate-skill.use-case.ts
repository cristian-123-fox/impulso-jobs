import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { Role } from '@/common/types/role.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { CandidateSkill } from '@/modules/candidates/entities/candidate-skill.entity';
import {
  type ICandidateProfileRepository,
  CANDIDATE_PROFILE_REPOSITORY,
} from '@/modules/candidates/repositories/candidate-profile.repository.interface';
import {
  type ICandidateSkillRepository,
  CANDIDATE_SKILL_REPOSITORY,
} from '@/modules/candidates/repositories/candidate-skill.repository.interface';

export interface CandidateSkillCommand {
  id?: string;
  userId: string;
  role: Role;
  name: string;
  level?: string;
  yearsExperience?: number;
  ip: string;
  userAgent: string;
}

@Injectable()
export class CandidateSkillUseCase {
  constructor(
    @Inject(CANDIDATE_PROFILE_REPOSITORY)
    private readonly profiles: ICandidateProfileRepository,
    @Inject(CANDIDATE_SKILL_REPOSITORY)
    private readonly skills: ICandidateSkillRepository,
    private readonly audit: AuditService,
  ) {}

  async list(userId: string, role: Role): Promise<CandidateSkill[]> {
    const profileId = await this.requireProfileId(userId, role);
    return this.skills.findByProfileId(profileId);
  }

  async save(command: CandidateSkillCommand): Promise<CandidateSkill> {
    const profileId = await this.requireProfileId(command.userId, command.role);
    const skill = command.id
      ? await this.requireSkill(command.id, profileId)
      : new CandidateSkill();

    skill.candidateProfileId = profileId;
    skill.name = command.name.trim();
    skill.level = command.level?.trim() || null;
    skill.yearsExperience = command.yearsExperience ?? null;

    const saved = await this.skills.save(skill);
    await this.audit.record({
      action: command.id ? 'candidate.skill.update' : 'candidate.skill.create',
      actorUserId: command.userId,
      entity: 'candidate_skill',
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
    const skill = await this.requireSkill(id, profileId);
    await this.skills.remove(skill);
    await this.audit.record({
      action: 'candidate.skill.delete',
      actorUserId: userId,
      entity: 'candidate_skill',
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

  private async requireSkill(id: string, profileId: string): Promise<CandidateSkill> {
    const skill = await this.skills.findByIdAndProfileId(id, profileId);
    if (!skill) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.CANDIDATE_RESOURCE_NOT_FOUND,
        'La habilidad no existe o no pertenece al candidato autenticado.',
      );
    }
    return skill;
  }

  private assertCandidateRole(role: Role): void {
    if (role !== Role.CANDIDATE) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        ErrorCode.FORBIDDEN,
        'Solo los candidatos pueden gestionar sus habilidades.',
      );
    }
  }
}
