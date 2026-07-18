import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { Role } from '@/common/types/role.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { CandidateProfile } from '@/modules/candidates/entities/candidate-profile.entity';
import { CandidateProfileSettings } from '@/modules/candidates/entities/candidate-profile-settings.entity';
import {
  InformationVisibility,
  ProfileVisibility,
} from '@/modules/candidates/enums/candidate-settings.enum';
import {
  type ICandidateProfileRepository,
  CANDIDATE_PROFILE_REPOSITORY,
} from '@/modules/candidates/repositories/candidate-profile.repository.interface';
import {
  type ICandidateProfileSettingsRepository,
  CANDIDATE_PROFILE_SETTINGS_REPOSITORY,
} from '@/modules/candidates/repositories/candidate-profile-settings.repository.interface';
import type { CandidateActor } from '@/modules/candidates/use-cases/candidate-profile.use-case';

export interface UpdateCandidateSettingsCommand extends CandidateActor {
  profileVisibility: ProfileVisibility;
  informationVisibility: InformationVisibility;
  isImmediatelyAvailable: boolean;
}

@Injectable()
export class CandidateSettingsUseCase {
  constructor(
    @Inject(CANDIDATE_PROFILE_REPOSITORY)
    private readonly profiles: ICandidateProfileRepository,
    @Inject(CANDIDATE_PROFILE_SETTINGS_REPOSITORY)
    private readonly settings: ICandidateProfileSettingsRepository,
    private readonly audit: AuditService,
  ) {}

  /**
   * Devuelve la configuración del candidato. Si aún no existe una fila, retorna
   * los valores por defecto (Público / Completa / No disponible) sin persistir:
   * "sin fila" equivale al valor por defecto para la búsqueda de M12.
   */
  async getSettings(
    userId: string,
    role: Role,
  ): Promise<CandidateProfileSettings> {
    this.assertCandidateRole(role);
    const profile = await this.requireProfile(userId);
    const existing = await this.settings.findByProfileId(profile.id);
    return existing ?? this.defaultSettings(profile.id);
  }

  /** Crea o actualiza la configuración. Cambios inmediatos; audita el cambio. */
  async updateSettings(
    command: UpdateCandidateSettingsCommand,
  ): Promise<CandidateProfileSettings> {
    this.assertCandidateRole(command.role);
    const profile = await this.requireProfile(command.userId);

    const settings =
      (await this.settings.findByProfileId(profile.id)) ??
      this.defaultSettings(profile.id);

    settings.profileVisibility = command.profileVisibility;
    settings.informationVisibility = command.informationVisibility;
    settings.isImmediatelyAvailable = command.isImmediatelyAvailable;

    const saved = await this.settings.save(settings);
    await this.audit.record({
      action: 'candidate.settings.update',
      actorUserId: command.userId,
      entity: 'candidate_profile_settings',
      entityId: saved.id,
      ip: command.ip,
      userAgent: command.userAgent,
      metadata: {
        profileVisibility: saved.profileVisibility,
        informationVisibility: saved.informationVisibility,
        isImmediatelyAvailable: saved.isImmediatelyAvailable,
      },
    });

    return saved;
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

  private defaultSettings(
    candidateProfileId: string,
  ): CandidateProfileSettings {
    return Object.assign(new CandidateProfileSettings(), {
      candidateProfileId,
      profileVisibility: ProfileVisibility.PUBLIC,
      informationVisibility: InformationVisibility.FULL,
      isImmediatelyAvailable: false,
    });
  }

  private assertCandidateRole(role: Role): void {
    if (role !== Role.CANDIDATE) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        ErrorCode.FORBIDDEN,
        'Solo los candidatos pueden gestionar su configuración.',
      );
    }
  }
}
