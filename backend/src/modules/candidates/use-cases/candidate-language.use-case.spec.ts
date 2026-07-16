import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { Role } from '@/common/types/role.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { CandidateLanguage } from '@/modules/candidates/entities/candidate-language.entity';
import { CandidateProfile } from '@/modules/candidates/entities/candidate-profile.entity';
import { Language } from '@/modules/candidates/entities/language.entity';
import { ICandidateLanguageRepository } from '@/modules/candidates/repositories/candidate-language.repository.interface';
import { ICandidateProfileRepository } from '@/modules/candidates/repositories/candidate-profile.repository.interface';
import { ILanguageRepository } from '@/modules/candidates/repositories/language.repository.interface';
import { CandidateLanguageUseCase } from '@/modules/candidates/use-cases/candidate-language.use-case';

function errorCodeOf(error: unknown): string | undefined {
  return error instanceof AppException
    ? (error.getResponse() as { errorCode?: string }).errorCode
    : undefined;
}

describe('CandidateLanguageUseCase', () => {
  let profiles: jest.Mocked<ICandidateProfileRepository>;
  let candidateLanguages: jest.Mocked<ICandidateLanguageRepository>;
  let languages: jest.Mocked<ILanguageRepository>;
  let audit: jest.Mocked<AuditService>;
  let useCase: CandidateLanguageUseCase;

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
    candidateLanguages = {
      findByProfileId: jest.fn().mockResolvedValue([]),
      findByIdAndProfileId: jest.fn(),
      existsByProfileIdAndLanguageCode: jest.fn().mockResolvedValue(false),
      countByProfileId: jest.fn().mockResolvedValue(0),
      save: jest.fn((item: CandidateLanguage) =>
        Promise.resolve(Object.assign(item, { id: item.id || 'lang-1' })),
      ),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    languages = {
      findAll: jest
        .fn()
        .mockResolvedValue([
          Object.assign(new Language(), { code: 'EN', name: 'Inglés' }),
        ]),
      findByCode: jest
        .fn()
        .mockResolvedValue(
          Object.assign(new Language(), { code: 'EN', name: 'Inglés' }),
        ),
    };
    audit = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;
    useCase = new CandidateLanguageUseCase(
      profiles,
      candidateLanguages,
      languages,
      audit,
    );
  });

  it('rechaza un idioma marcado como nativo con nivel distinto de NATIVE', async () => {
    const thrown = await useCase
      .save({
        userId: 'user-1',
        role: Role.CANDIDATE,
        languageCode: 'EN',
        level: 'ADVANCED',
        isNative: true,
        ip: '127.0.0.1',
        userAgent: 'jest',
      })
      .catch((error: unknown) => error);

    expect(errorCodeOf(thrown)).toBe(ErrorCode.CANDIDATE_NATIVE_LEVEL_REQUIRED);
  });

  it('rechaza un idioma duplicado en el mismo perfil', async () => {
    candidateLanguages.existsByProfileIdAndLanguageCode.mockResolvedValue(true);

    const thrown = await useCase
      .save({
        userId: 'user-1',
        role: Role.CANDIDATE,
        languageCode: 'EN',
        level: 'ADVANCED',
        isNative: false,
        ip: '127.0.0.1',
        userAgent: 'jest',
      })
      .catch((error: unknown) => error);

    expect(errorCodeOf(thrown)).toBe(ErrorCode.CANDIDATE_LANGUAGE_DUPLICATED);
  });

  it('guarda el nivel NATIVE cuando el idioma es nativo', async () => {
    const saved = await useCase.save({
      userId: 'user-1',
      role: Role.CANDIDATE,
      languageCode: 'en',
      level: 'NATIVE',
      isNative: true,
      ip: '127.0.0.1',
      userAgent: 'jest',
    });

    expect(saved.languageCode).toBe('EN');
    expect(saved.level).toBe('NATIVE');
  });
});
