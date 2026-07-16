import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { Role } from '@/common/types/role.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { CandidateExperience } from '@/modules/candidates/entities/candidate-experience.entity';
import { CandidateProfile } from '@/modules/candidates/entities/candidate-profile.entity';
import { ICandidateExperienceRepository } from '@/modules/candidates/repositories/candidate-experience.repository.interface';
import { ICandidateProfileRepository } from '@/modules/candidates/repositories/candidate-profile.repository.interface';
import { CandidateExperienceUseCase } from '@/modules/candidates/use-cases/candidate-experience.use-case';

function errorCodeOf(error: unknown): string | undefined {
  return error instanceof AppException
    ? (error.getResponse() as { errorCode?: string }).errorCode
    : undefined;
}

describe('CandidateExperienceUseCase', () => {
  let profiles: jest.Mocked<ICandidateProfileRepository>;
  let experiences: jest.Mocked<ICandidateExperienceRepository>;
  let audit: jest.Mocked<AuditService>;
  let useCase: CandidateExperienceUseCase;

  beforeEach(() => {
    profiles = {
      findByUserId: jest
        .fn()
        .mockResolvedValue(Object.assign(new CandidateProfile(), { id: 'profile-1' })),
      existsByDocumentNumber: jest.fn(),
      save: jest.fn(),
    };
    experiences = {
      findByProfileId: jest.fn().mockResolvedValue([]),
      findByIdAndProfileId: jest.fn(),
      countByProfileId: jest.fn().mockResolvedValue(0),
      save: jest.fn((item: CandidateExperience) =>
        Promise.resolve(Object.assign(item, { id: item.id || 'exp-1' })),
      ),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    audit = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;
    useCase = new CandidateExperienceUseCase(profiles, experiences, audit);
  });

  it('rechaza una fecha de inicio futura', async () => {
    const thrown = await useCase
      .save({
        userId: 'user-1',
        role: Role.CANDIDATE,
        jobTitle: 'Frontend',
        companyName: 'Impulso',
        location: 'CDMX',
        startDate: '2999-01-01',
        isCurrent: true,
        ip: '127.0.0.1',
        userAgent: 'jest',
      })
      .catch((error: unknown) => error);

    expect(errorCodeOf(thrown)).toBe(ErrorCode.CANDIDATE_DATE_IN_FUTURE);
    expect(experiences.save).not.toHaveBeenCalled();
  });

  it('rechaza actualizar una experiencia de otro candidato', async () => {
    experiences.findByIdAndProfileId.mockResolvedValue(null);

    const thrown = await useCase
      .save({
        id: 'other-exp',
        userId: 'user-1',
        role: Role.CANDIDATE,
        jobTitle: 'Frontend',
        companyName: 'Impulso',
        location: 'CDMX',
        startDate: '2024-01-01',
        endDate: '2024-06-01',
        isCurrent: false,
        ip: '127.0.0.1',
        userAgent: 'jest',
      })
      .catch((error: unknown) => error);

    expect(errorCodeOf(thrown)).toBe(ErrorCode.CANDIDATE_RESOURCE_NOT_FOUND);
  });

  it('permite experiencia actual dejando la fecha fin en null', async () => {
    const saved = await useCase.save({
      userId: 'user-1',
      role: Role.CANDIDATE,
      jobTitle: 'Backend Engineer',
      companyName: 'Impulso',
      location: 'Guadalajara',
      startDate: '2024-01-01',
      endDate: '2024-06-01',
      isCurrent: true,
      ip: '127.0.0.1',
      userAgent: 'jest',
    });

    expect(saved.endDate).toBeNull();
    expect(experiences.save).toHaveBeenCalledWith(
      expect.objectContaining({ isCurrent: true, endDate: null }),
    );
  });
});
