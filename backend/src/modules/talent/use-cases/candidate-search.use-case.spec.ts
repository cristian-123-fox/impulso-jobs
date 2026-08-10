import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { CandidateProfileSettings } from '@/modules/candidates/entities/candidate-profile-settings.entity';
import { CandidateProfile } from '@/modules/candidates/entities/candidate-profile.entity';
import {
  InformationVisibility,
  ProfileVisibility,
} from '@/modules/candidates/enums/candidate-settings.enum';
import { ICandidateEducationRepository } from '@/modules/candidates/repositories/candidate-education.repository.interface';
import { ICandidateExperienceRepository } from '@/modules/candidates/repositories/candidate-experience.repository.interface';
import { ICandidateLanguageRepository } from '@/modules/candidates/repositories/candidate-language.repository.interface';
import { ICandidateProfileSettingsRepository } from '@/modules/candidates/repositories/candidate-profile-settings.repository.interface';
import { ICandidateResumeRepository } from '@/modules/candidates/repositories/candidate-resume.repository.interface';
import { ICandidateSkillRepository } from '@/modules/candidates/repositories/candidate-skill.repository.interface';
import { User } from '@/modules/iam/users/entities/user.entity';
import { IUserRepository } from '@/modules/iam/users/repositories/user.repository.interface';
import { CandidateAccessSource } from '@/modules/talent/enums/talent-access.enum';
import { ICandidateSearchRepository } from '@/modules/talent/repositories/candidate-search.repository.interface';
import { ITalentAccessRepository } from '@/modules/talent/repositories/talent-access.repository.interface';
import { TalentQuotaService } from '@/modules/talent/services/talent-quota.service';
import { CandidateSearchUseCase } from '@/modules/talent/use-cases/candidate-search.use-case';
import { VacancyOwnershipService } from '@/modules/vacancies/services/vacancy-ownership.service';

function errorCodeOf(e: unknown): string | undefined {
  return e instanceof AppException
    ? (e.getResponse() as { errorCode?: string }).errorCode
    : undefined;
}

function profile(overrides: Partial<CandidateProfile> = {}): CandidateProfile {
  return Object.assign(new CandidateProfile(), {
    id: 'cand-1',
    userId: 'user-1',
    firstName: 'Ana',
    lastName: 'López',
    professionalTitle: 'Frontend Engineer',
    state: 'JAL',
    municipality: 'Zapopan',
    ...overrides,
  });
}

function settingsRow(
  informationVisibility: InformationVisibility,
): CandidateProfileSettings {
  return Object.assign(new CandidateProfileSettings(), {
    candidateProfileId: 'cand-1',
    profileVisibility: ProfileVisibility.PUBLIC,
    informationVisibility,
    isImmediatelyAvailable: true,
  });
}

const actor = { userId: 'recruiter-1', ip: '127.0.0.1', userAgent: 'jest' };
const freeQuota = {
  totalVisits: 20,
  usedVisits: 1,
  remainingVisits: 19,
  unlimited: false,
};

describe('CandidateSearchUseCase', () => {
  let candidates: jest.Mocked<ICandidateSearchRepository>;
  let settings: jest.Mocked<ICandidateProfileSettingsRepository>;
  let experiences: jest.Mocked<ICandidateExperienceRepository>;
  let educations: jest.Mocked<ICandidateEducationRepository>;
  let languages: jest.Mocked<ICandidateLanguageRepository>;
  let skills: jest.Mocked<ICandidateSkillRepository>;
  let resumes: jest.Mocked<ICandidateResumeRepository>;
  let users: jest.Mocked<IUserRepository>;
  let access: jest.Mocked<ITalentAccessRepository>;
  let companyOwnership: jest.Mocked<VacancyOwnershipService>;
  let quota: jest.Mocked<TalentQuotaService>;
  let audit: jest.Mocked<AuditService>;
  let useCase: CandidateSearchUseCase;

  beforeEach(() => {
    candidates = {
      search: jest.fn().mockResolvedValue([[profile()], 1]),
      findVisibleById: jest.fn().mockResolvedValue(profile()),
      hasAppliedToCompany: jest.fn().mockResolvedValue(false),
      filterAppliedToCompany: jest.fn().mockResolvedValue([]),
    };

    settings = {
      findByProfileId: jest.fn().mockResolvedValue(null),
      findByProfileIds: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<ICandidateProfileSettingsRepository>;

    const empty = { findByProfileId: jest.fn().mockResolvedValue([]) };
    experiences =
      empty as unknown as jest.Mocked<ICandidateExperienceRepository>;
    educations = empty as unknown as jest.Mocked<ICandidateEducationRepository>;
    languages = empty as unknown as jest.Mocked<ICandidateLanguageRepository>;
    skills = empty as unknown as jest.Mocked<ICandidateSkillRepository>;
    resumes = empty as unknown as jest.Mocked<ICandidateResumeRepository>;

    users = {
      findById: jest.fn().mockResolvedValue(
        Object.assign(new User(), {
          id: 'user-1',
          email: 'ana@example.com',
        }),
      ),
    } as unknown as jest.Mocked<IUserRepository>;

    access = {
      findView: jest.fn().mockResolvedValue(null),
      findViewedCandidateIds: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<ITalentAccessRepository>;

    companyOwnership = {
      requireCompany: jest.fn().mockResolvedValue({ id: 'company-1' }),
    } as unknown as jest.Mocked<VacancyOwnershipService>;

    quota = {
      summary: jest.fn().mockResolvedValue(freeQuota),
      consume: jest.fn().mockResolvedValue({ charged: true, quota: freeQuota }),
    } as unknown as jest.Mocked<TalentQuotaService>;

    audit = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;

    useCase = new CandidateSearchUseCase(
      candidates,
      settings,
      experiences,
      educations,
      languages,
      skills,
      resumes,
      users,
      access,
      companyOwnership,
      quota,
      audit,
    );
  });

  describe('search', () => {
    it('marca como base de talento a quien no ha postulado', async () => {
      const result = await useCase.search({ page: 1, limit: 10, ...actor });

      expect(result.items[0].accessSource).toBe(
        CandidateAccessSource.TALENT_POOL,
      );
      // Todavía no se ha abierto: abrirlo costará una visita.
      expect(result.items[0].alreadyUnlocked).toBe(false);
      expect(result.quota).toEqual(freeQuota);
    });

    it('marca como postulante a quien aplicó, y sale gratis', async () => {
      candidates.filterAppliedToCompany.mockResolvedValue(['cand-1']);

      const result = await useCase.search({ page: 1, limit: 10, ...actor });

      expect(result.items[0].accessSource).toBe(
        CandidateAccessSource.APPLICANT,
      );
      expect(result.items[0].alreadyUnlocked).toBe(true);
    });

    it('marca como desbloqueado el CV que la empresa ya pagó', async () => {
      access.findViewedCandidateIds.mockResolvedValue(['cand-1']);

      const result = await useCase.search({ page: 1, limit: 10, ...actor });

      expect(result.items[0].alreadyUnlocked).toBe(true);
    });

    it('el listado nunca consume cupo', async () => {
      await useCase.search({ page: 1, limit: 10, ...actor });

      expect(quota.consume).not.toHaveBeenCalled();
    });

    it('traduce los años de experiencia a una fecha límite', async () => {
      await useCase.search({
        page: 1,
        limit: 10,
        minExperienceYears: 5,
        ...actor,
      });

      const criteria = candidates.search.mock.calls[0][0];
      const since = criteria.experienceSince as Date;
      const expected = new Date().getFullYear() - 5;
      expect(since.getFullYear()).toBe(expected);
    });

    it('sin filtro de experiencia no acota por fecha', async () => {
      await useCase.search({ page: 1, limit: 10, ...actor });

      expect(
        candidates.search.mock.calls[0][0].experienceSince,
      ).toBeUndefined();
    });
  });

  describe('get', () => {
    it('consume una visita al abrir un perfil de la base de talento', async () => {
      await useCase.get('cand-1', actor);

      expect(quota.consume).toHaveBeenCalledWith('company-1', 'cand-1');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'candidates.cv.read',
          metadata: expect.objectContaining({ chargedVisit: true }),
        }),
      );
    });

    it('no consume cupo si el candidato postuló a la empresa', async () => {
      candidates.hasAppliedToCompany.mockResolvedValue(true);

      const detail = await useCase.get('cand-1', actor);

      expect(quota.consume).not.toHaveBeenCalled();
      expect(detail.accessSource).toBe(CandidateAccessSource.APPLICANT);
    });

    it('404 cuando el perfil es privado y no ha postulado', async () => {
      candidates.findVisibleById.mockResolvedValue(null);

      try {
        await useCase.get('cand-privado', actor);
        fail('debió lanzar');
      } catch (e) {
        expect(errorCodeOf(e)).toBe(ErrorCode.TALENT_CANDIDATE_NOT_FOUND);
      }
      // No debe cobrarse por un perfil que no se llegó a mostrar.
      expect(quota.consume).not.toHaveBeenCalled();
    });

    it('propaga el bloqueo por cupo agotado sin exponer el perfil', async () => {
      quota.consume.mockRejectedValue(
        new AppException(
          402,
          ErrorCode.TALENT_QUOTA_EXHAUSTED,
          'Agotaste las visitas.',
        ),
      );

      try {
        await useCase.get('cand-1', actor);
        fail('debió lanzar');
      } catch (e) {
        expect(errorCodeOf(e)).toBe(ErrorCode.TALENT_QUOTA_EXHAUSTED);
      }
      expect(users.findById).not.toHaveBeenCalled();
      expect(audit.record).not.toHaveBeenCalled();
    });

    it('muestra el correo con información completa', async () => {
      settings.findByProfileId.mockResolvedValue(
        settingsRow(InformationVisibility.FULL),
      );

      const detail = await useCase.get('cand-1', actor);

      expect(detail.email).toBe('ana@example.com');
    });

    it('oculta el correo cuando la información es parcial', async () => {
      settings.findByProfileId.mockResolvedValue(
        settingsRow(InformationVisibility.PARTIAL),
      );

      const detail = await useCase.get('cand-1', actor);

      expect(detail.email).toBeNull();
      // El resto del perfil profesional sigue visible.
      expect(detail.professionalTitle).toBe('Frontend Engineer');
    });

    it('sin fila de configuración se aplica el defecto de M8 (completa)', async () => {
      settings.findByProfileId.mockResolvedValue(null);

      const detail = await useCase.get('cand-1', actor);

      expect(detail.email).toBe('ana@example.com');
    });
  });
});
