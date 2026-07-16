import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { Role } from '@/common/types/role.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { CandidateLanguage } from '@/modules/candidates/entities/candidate-language.entity';
import { Language } from '@/modules/candidates/entities/language.entity';
import {
  type ICandidateLanguageRepository,
  CANDIDATE_LANGUAGE_REPOSITORY,
} from '@/modules/candidates/repositories/candidate-language.repository.interface';
import {
  type ICandidateProfileRepository,
  CANDIDATE_PROFILE_REPOSITORY,
} from '@/modules/candidates/repositories/candidate-profile.repository.interface';
import {
  type ILanguageRepository,
  LANGUAGE_REPOSITORY,
} from '@/modules/candidates/repositories/language.repository.interface';

export interface CandidateLanguageCommand {
  id?: string;
  userId: string;
  role: Role;
  languageCode: string;
  level: string;
  isNative: boolean;
  ip: string;
  userAgent: string;
}

@Injectable()
export class CandidateLanguageUseCase {
  constructor(
    @Inject(CANDIDATE_PROFILE_REPOSITORY)
    private readonly profiles: ICandidateProfileRepository,
    @Inject(CANDIDATE_LANGUAGE_REPOSITORY)
    private readonly candidateLanguages: ICandidateLanguageRepository,
    @Inject(LANGUAGE_REPOSITORY)
    private readonly languages: ILanguageRepository,
    private readonly audit: AuditService,
  ) {}

  async list(
    userId: string,
    role: Role,
  ): Promise<Array<{ candidateLanguage: CandidateLanguage; language: Language }>> {
    const profileId = await this.requireProfileId(userId, role);
    const items = await this.candidateLanguages.findByProfileId(profileId);
    const catalog = await this.languages.findAll();
    const byCode = new Map(catalog.map((item) => [item.code, item]));
    return items
      .map((item) => {
        const language = byCode.get(item.languageCode);
        return language ? { candidateLanguage: item, language } : null;
      })
      .filter((item): item is { candidateLanguage: CandidateLanguage; language: Language } =>
        Boolean(item),
      );
  }

  async save(command: CandidateLanguageCommand): Promise<CandidateLanguage> {
    const profileId = await this.requireProfileId(command.userId, command.role);
    const languageCode = command.languageCode.trim().toUpperCase();
    const language = await this.languages.findByCode(languageCode);
    if (!language) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.CANDIDATE_LANGUAGE_NOT_FOUND,
        'El idioma seleccionado no existe en el catálogo.',
      );
    }
    if (command.isNative && command.level !== 'NATIVE') {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.CANDIDATE_NATIVE_LEVEL_REQUIRED,
        'Un idioma marcado como nativo debe quedar con nivel NATIVE.',
      );
    }
    if (
      await this.candidateLanguages.existsByProfileIdAndLanguageCode(
        profileId,
        languageCode,
        command.id,
      )
    ) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.CANDIDATE_LANGUAGE_DUPLICATED,
        'Este idioma ya fue agregado al perfil.',
      );
    }

    const candidateLanguage = command.id
      ? await this.requireCandidateLanguage(command.id, profileId)
      : new CandidateLanguage();

    candidateLanguage.candidateProfileId = profileId;
    candidateLanguage.languageCode = languageCode;
    candidateLanguage.level = command.isNative ? 'NATIVE' : command.level;
    candidateLanguage.isNative = command.isNative;

    const saved = await this.candidateLanguages.save(candidateLanguage);
    await this.audit.record({
      action: command.id ? 'candidate.language.update' : 'candidate.language.create',
      actorUserId: command.userId,
      entity: 'candidate_language',
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
    const language = await this.requireCandidateLanguage(id, profileId);
    await this.candidateLanguages.remove(language);
    await this.audit.record({
      action: 'candidate.language.delete',
      actorUserId: userId,
      entity: 'candidate_language',
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

  private async requireCandidateLanguage(
    id: string,
    profileId: string,
  ): Promise<CandidateLanguage> {
    const language = await this.candidateLanguages.findByIdAndProfileId(id, profileId);
    if (!language) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.CANDIDATE_RESOURCE_NOT_FOUND,
        'El idioma no existe o no pertenece al candidato autenticado.',
      );
    }
    return language;
  }

  private assertCandidateRole(role: Role): void {
    if (role !== Role.CANDIDATE) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        ErrorCode.FORBIDDEN,
        'Solo los candidatos pueden gestionar sus idiomas.',
      );
    }
  }
}
