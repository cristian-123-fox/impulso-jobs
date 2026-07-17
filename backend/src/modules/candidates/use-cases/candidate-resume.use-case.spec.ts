import { DataSource, EntityManager } from 'typeorm';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { Role } from '@/common/types/role.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { CandidateProfile } from '@/modules/candidates/entities/candidate-profile.entity';
import { CandidateResume } from '@/modules/candidates/entities/candidate-resume.entity';
import { ICandidateProfileRepository } from '@/modules/candidates/repositories/candidate-profile.repository.interface';
import { ICandidateResumeRepository } from '@/modules/candidates/repositories/candidate-resume.repository.interface';
import { ICandidateResumeStorage } from '@/modules/candidates/services/candidate-resume-storage.port';
import { CandidateResumeUseCase } from '@/modules/candidates/use-cases/candidate-resume.use-case';

function errorCodeOf(error: unknown): string | undefined {
  return error instanceof AppException
    ? (error.getResponse() as { errorCode?: string }).errorCode
    : undefined;
}

describe('CandidateResumeUseCase', () => {
  let dataSource: DataSource;
  let profiles: jest.Mocked<ICandidateProfileRepository>;
  let resumes: jest.Mocked<ICandidateResumeRepository>;
  let storage: jest.Mocked<ICandidateResumeStorage>;
  let audit: jest.Mocked<AuditService>;
  let useCase: CandidateResumeUseCase;

  beforeEach(() => {
    dataSource = {
      transaction: jest.fn(
        async <T>(work: (manager: EntityManager) => Promise<T>) =>
          work({} as EntityManager),
      ),
    } as unknown as DataSource;

    profiles = {
      findByUserId: jest
        .fn()
        .mockResolvedValue(Object.assign(new CandidateProfile(), { id: 'profile-1' })),
      existsByDocumentNumber: jest.fn(),
      save: jest.fn(),
    };

    resumes = {
      findByProfileId: jest.fn().mockResolvedValue([]),
      findByIdAndProfileId: jest.fn(),
      countByProfileId: jest.fn().mockResolvedValue(0),
      save: jest.fn((resume: CandidateResume) => Promise.resolve(resume)),
      remove: jest.fn().mockResolvedValue(undefined),
      clearDefaultByProfileId: jest.fn().mockResolvedValue(undefined),
      findLatestByProfileId: jest.fn().mockResolvedValue(null),
    };

    storage = {
      save: jest.fn().mockResolvedValue({ storageKey: 'profile-1/resume-1.pdf' }),
      delete: jest.fn().mockResolvedValue(undefined),
      openReadStream: jest.fn(),
    };

    audit = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;

    useCase = new CandidateResumeUseCase(
      dataSource,
      profiles,
      resumes,
      storage,
      audit,
    );
  });

  it('rechaza archivos que no son PDF válidos', async () => {
    const thrown = await useCase
      .upload({
        userId: 'user-1',
        role: Role.CANDIDATE,
        ip: '127.0.0.1',
        userAgent: 'jest',
        file: {
          originalname: 'cv.docx',
          mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          size: 1024,
          buffer: Buffer.from('not-a-pdf'),
        },
      })
      .catch((error: unknown) => error);

    expect(errorCodeOf(thrown)).toBe(ErrorCode.CANDIDATE_RESUME_INVALID_TYPE);
    expect(storage.save).not.toHaveBeenCalled();
  });

  it('marca como principal la primera hoja de vida cargada', async () => {
    const saved = await useCase.upload({
      userId: 'user-1',
      role: Role.CANDIDATE,
      ip: '127.0.0.1',
      userAgent: 'jest',
      file: {
        originalname: 'CV-Maria.pdf',
        mimetype: 'application/pdf',
        size: 2048,
        buffer: Buffer.from('%PDF-1.7 contenido'),
      },
    });

    expect(saved.isDefault).toBe(true);
    expect(saved.fileName).toBe('CV-Maria.pdf');
    expect(resumes.save).toHaveBeenCalledWith(
      expect.objectContaining({
        candidateProfileId: 'profile-1',
        isDefault: true,
        mimeType: 'application/pdf',
      }),
      expect.anything(),
    );
  });

  it('promueve la hoja más reciente al eliminar la principal', async () => {
    const current = Object.assign(new CandidateResume(), {
      id: 'resume-1',
      candidateProfileId: 'profile-1',
      fileName: 'Principal.pdf',
      fileUrl: '/api/v1/candidate/resumes/resume-1/download',
      fileSize: 100,
      mimeType: 'application/pdf',
      storageKey: 'profile-1/resume-1.pdf',
      isDefault: true,
    });
    const replacement = Object.assign(new CandidateResume(), {
      id: 'resume-2',
      candidateProfileId: 'profile-1',
      fileName: 'Nueva.pdf',
      fileUrl: '/api/v1/candidate/resumes/resume-2/download',
      fileSize: 100,
      mimeType: 'application/pdf',
      storageKey: 'profile-1/resume-2.pdf',
      isDefault: false,
    });

    resumes.findByIdAndProfileId
      .mockResolvedValueOnce(current)
      .mockResolvedValueOnce(current);
    resumes.findLatestByProfileId.mockResolvedValue(replacement);

    await useCase.remove(
      'resume-1',
      'user-1',
      Role.CANDIDATE,
      '127.0.0.1',
      'jest',
    );

    expect(storage.delete).toHaveBeenCalledWith('profile-1/resume-1.pdf');
    expect(resumes.clearDefaultByProfileId).toHaveBeenCalledWith(
      'profile-1',
      expect.anything(),
    );
    expect(resumes.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'resume-2', isDefault: true }),
      expect.anything(),
    );
  });
});
