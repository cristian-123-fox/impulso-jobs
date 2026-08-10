import { DataSource } from 'typeorm';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { TalentAccessGrant } from '@/modules/talent/entities/talent-access-grant.entity';
import { TalentAccessView } from '@/modules/talent/entities/talent-access-view.entity';
import {
  TalentGrantSource,
  UNLIMITED_VISITS,
} from '@/modules/talent/enums/talent-access.enum';
import { ITalentAccessRepository } from '@/modules/talent/repositories/talent-access.repository.interface';
import { TalentQuotaService } from '@/modules/talent/services/talent-quota.service';

function errorCodeOf(e: unknown): string | undefined {
  return e instanceof AppException
    ? (e.getResponse() as { errorCode?: string }).errorCode
    : undefined;
}

function grant(overrides: Partial<TalentAccessGrant> = {}): TalentAccessGrant {
  return Object.assign(new TalentAccessGrant(), {
    id: 'grant-1',
    companyId: 'company-1',
    sourceType: TalentGrantSource.PROMOTION,
    sourceId: null,
    totalVisits: 20,
    usedVisits: 0,
    expiresAt: null,
    ...overrides,
  });
}

describe('TalentQuotaService', () => {
  let dataSource: DataSource;
  let access: jest.Mocked<ITalentAccessRepository>;
  let service: TalentQuotaService;
  let grants: TalentAccessGrant[];
  let views: TalentAccessView[];

  beforeEach(() => {
    grants = [grant()];
    views = [];

    dataSource = {
      transaction: jest.fn((work: (m: unknown) => Promise<unknown>) =>
        work({}),
      ),
    } as unknown as DataSource;

    access = {
      findActiveGrants: jest.fn(() => Promise.resolve(grants)),
      saveGrant: jest.fn((g: TalentAccessGrant) => Promise.resolve(g)),
      findView: jest.fn((companyId: string, candidateProfileId: string) =>
        Promise.resolve(
          views.find(
            (v) =>
              v.companyId === companyId &&
              v.candidateProfileId === candidateProfileId,
          ) ?? null,
        ),
      ),
      findViewedCandidateIds: jest.fn().mockResolvedValue([]),
      saveView: jest.fn((v: TalentAccessView) => {
        views.push(v);
        return Promise.resolve(v);
      }),
    } as unknown as jest.Mocked<ITalentAccessRepository>;

    service = new TalentQuotaService(dataSource, access);
  });

  describe('summary', () => {
    it('suma los cupos vigentes y calcula lo restante', async () => {
      grants = [
        grant({ id: 'g1', totalVisits: 20, usedVisits: 5 }),
        grant({ id: 'g2', totalVisits: 10, usedVisits: 2 }),
      ];

      expect(await service.summary('company-1')).toEqual({
        totalVisits: 30,
        usedVisits: 7,
        remainingVisits: 23,
        unlimited: false,
      });
    });

    it('sin cupos, la empresa tiene 0 visitas', async () => {
      grants = [];

      expect(await service.summary('company-1')).toEqual({
        totalVisits: 0,
        usedVisits: 0,
        remainingVisits: 0,
        unlimited: false,
      });
    });

    it('un cupo ilimitado marca todo como ilimitado', async () => {
      grants = [grant({ totalVisits: UNLIMITED_VISITS, usedVisits: 99 })];

      const summary = await service.summary('company-1');
      expect(summary.unlimited).toBe(true);
      expect(summary.remainingVisits).toBe(UNLIMITED_VISITS);
    });
  });

  describe('consume', () => {
    it('descuenta una visita y deja registrado el desbloqueo', async () => {
      const result = await service.consume('company-1', 'cand-1');

      expect(result.charged).toBe(true);
      expect(result.quota.usedVisits).toBe(1);
      expect(result.quota.remainingVisits).toBe(19);
      expect(access.saveGrant).toHaveBeenCalledTimes(1);
      expect(access.saveView).toHaveBeenCalledTimes(1);
      expect(views[0].candidateProfileId).toBe('cand-1');
      expect(views[0].grantId).toBe('grant-1');
    });

    it('no vuelve a cobrar el mismo CV', async () => {
      await service.consume('company-1', 'cand-1');
      access.saveGrant.mockClear();

      const second = await service.consume('company-1', 'cand-1');

      expect(second.charged).toBe(false);
      expect(access.saveGrant).not.toHaveBeenCalled();
      expect(views).toHaveLength(1);
    });

    it('cobra por separado a candidatos distintos', async () => {
      await service.consume('company-1', 'cand-1');
      const second = await service.consume('company-1', 'cand-2');

      expect(second.charged).toBe(true);
      expect(second.quota.usedVisits).toBe(2);
    });

    it('bloquea con upsell cuando el cupo está agotado', async () => {
      grants = [grant({ totalVisits: 20, usedVisits: 20 })];

      try {
        await service.consume('company-1', 'cand-1');
        fail('debió lanzar');
      } catch (e) {
        expect(errorCodeOf(e)).toBe(ErrorCode.TALENT_QUOTA_EXHAUSTED);
      }
      expect(access.saveView).not.toHaveBeenCalled();
    });

    it('bloquea cuando la empresa no tiene ningún cupo (sin plan)', async () => {
      grants = [];

      try {
        await service.consume('company-1', 'cand-1');
        fail('debió lanzar');
      } catch (e) {
        expect(errorCodeOf(e)).toBe(ErrorCode.TALENT_QUOTA_EXHAUSTED);
      }
    });

    it('un cupo ilimitado no incrementa el contador', async () => {
      grants = [grant({ totalVisits: UNLIMITED_VISITS, usedVisits: 0 })];

      const result = await service.consume('company-1', 'cand-1');

      expect(result.charged).toBe(true);
      expect(access.saveGrant).not.toHaveBeenCalled();
      // El desbloqueo sí queda registrado, para no recontar más adelante.
      expect(access.saveView).toHaveBeenCalledTimes(1);
    });

    it('consume el cupo que caduca antes y salta el ya agotado', async () => {
      const soon = new Date('2026-09-01');
      grants = [
        grant({
          id: 'agotado',
          totalVisits: 5,
          usedVisits: 5,
          expiresAt: soon,
        }),
        grant({ id: 'vigente', totalVisits: 20, usedVisits: 0 }),
      ];

      await service.consume('company-1', 'cand-1');

      const saved = access.saveGrant.mock.calls[0][0];
      expect(saved.id).toBe('vigente');
      expect(views[0].grantId).toBe('vigente');
    });
  });
});
