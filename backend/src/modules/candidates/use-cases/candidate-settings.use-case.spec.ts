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
import { ICandidateProfileRepository } from '@/modules/candidates/repositories/candidate-profile.repository.interface';
import { ICandidateProfileSettingsRepository } from '@/modules/candidates/repositories/candidate-profile-settings.repository.interface';
import { CandidateSettingsUseCase } from '@/modules/candidates/use-cases/candidate-settings.use-case';

function errorCodeOf(error: unknown): string | undefined {
  return error instanceof AppException
    ? (error.getResponse() as { errorCode?: string }).errorCode
    : undefined;
}

describe('CandidateSettingsUseCase', () => {
  let profiles: jest.Mocked<ICandidateProfileRepository>;
  let settings: jest.Mocked<ICandidateProfileSettingsRepository>;
  let audit: jest.Mocked<AuditService>;
  let useCase: CandidateSettingsUseCase;

  beforeEach(() => {
    profiles = {
      findByUserId: jest
        .fn()
        .mockResolvedValue(
          Object.assign(new CandidateProfile(), { id: 'profile-1' }),
        ),
      existsByDocumentNumber: jest.fn(),
      save: jest.fn(),
    };
    settings = {
      findByProfileId: jest.fn().mockResolvedValue(null),
      save: jest.fn((item: CandidateProfileSettings) =>
        Promise.resolve(Object.assign(item, { id: item.id || 'settings-1' })),
      ),
    };
    audit = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;
    useCase = new CandidateSettingsUseCase(profiles, settings, audit);
  });

  it('rechaza a un usuario que no es candidato', async () => {
    const thrown = await useCase
      .getSettings('user-1', Role.EMPLOYER)
      .catch((error: unknown) => error);

    expect(errorCodeOf(thrown)).toBe(ErrorCode.FORBIDDEN);
  });

  it('devuelve los valores por defecto cuando no existe configuración', async () => {
    const result = await useCase.getSettings('user-1', Role.CANDIDATE);

    expect(result.profileVisibility).toBe(ProfileVisibility.PUBLIC);
    expect(result.informationVisibility).toBe(InformationVisibility.FULL);
    expect(result.isImmediatelyAvailable).toBe(false);
    expect(settings.save).not.toHaveBeenCalled();
  });

  it('crea y audita la configuración al marcar el perfil como privado', async () => {
    const saved = await useCase.updateSettings({
      userId: 'user-1',
      role: Role.CANDIDATE,
      profileVisibility: ProfileVisibility.PRIVATE,
      informationVisibility: InformationVisibility.PARTIAL,
      isImmediatelyAvailable: true,
      ip: '127.0.0.1',
      userAgent: 'jest',
    });

    expect(saved.candidateProfileId).toBe('profile-1');
    expect(saved.profileVisibility).toBe(ProfileVisibility.PRIVATE);
    expect(saved.informationVisibility).toBe(InformationVisibility.PARTIAL);
    expect(saved.isImmediatelyAvailable).toBe(true);
    expect(settings.save).toHaveBeenCalledTimes(1);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'candidate.settings.update',
        entity: 'candidate_profile_settings',
        entityId: 'settings-1',
      }),
    );
  });

  it('actualiza la configuración existente sin duplicar la fila', async () => {
    settings.findByProfileId.mockResolvedValue(
      Object.assign(new CandidateProfileSettings(), {
        id: 'settings-1',
        candidateProfileId: 'profile-1',
        profileVisibility: ProfileVisibility.PUBLIC,
        informationVisibility: InformationVisibility.FULL,
        isImmediatelyAvailable: false,
      }),
    );

    const saved = await useCase.updateSettings({
      userId: 'user-1',
      role: Role.CANDIDATE,
      profileVisibility: ProfileVisibility.PRIVATE,
      informationVisibility: InformationVisibility.FULL,
      isImmediatelyAvailable: false,
      ip: '127.0.0.1',
      userAgent: 'jest',
    });

    expect(saved.id).toBe('settings-1');
    expect(saved.profileVisibility).toBe(ProfileVisibility.PRIVATE);
  });
});
