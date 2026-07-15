import { DataSource } from 'typeorm';
import { TokenType } from '@/common/types/token-type.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { ITokenUserRepository } from '@/modules/iam/users/repositories/token-user.repository.interface';
import { IBlacklistTokenRepository } from '@/modules/iam/users/repositories/blacklist-token.repository.interface';
import { TokenService } from '@/modules/iam/auth/services/token.service';
import { LogoutUseCase } from '@/modules/iam/auth/use-cases/logout.use-case';

describe('LogoutUseCase', () => {
  let tokens: jest.Mocked<ITokenUserRepository>;
  let blacklist: jest.Mocked<IBlacklistTokenRepository>;
  let tokenService: jest.Mocked<TokenService>;
  let audit: jest.Mocked<AuditService>;
  let dataSource: DataSource;
  let useCase: LogoutUseCase;

  beforeEach(() => {
    tokens = { revoke: jest.fn(), create: jest.fn(), findByJti: jest.fn() };
    blacklist = {
      add: jest.fn(),
      existsByJti: jest.fn().mockResolvedValue(false),
    };
    tokenService = {
      verifyRefresh: jest.fn(),
      decode: jest.fn(),
    } as unknown as jest.Mocked<TokenService>;
    audit = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;
    dataSource = {
      transaction: jest.fn(async (work: (m: unknown) => Promise<unknown>) =>
        work({}),
      ),
    } as unknown as DataSource;

    useCase = new LogoutUseCase(
      tokens,
      blacklist,
      tokenService,
      audit,
      dataSource,
    );
  });

  it('revoca el refresh y lleva refresh y access a la blacklist', async () => {
    tokenService.verifyRefresh.mockResolvedValue({
      sub: 'user-1',
      type: TokenType.REFRESH,
      jti: 'r1',
    });

    await useCase.execute({
      refreshToken: 'refresh.jwt',
      accessJti: 'a1',
      actorUserId: 'user-1',
      ip: '127.0.0.1',
      userAgent: 'jest',
    });

    expect(tokens.revoke).toHaveBeenCalledWith('r1', expect.anything());
    expect(blacklist.add).toHaveBeenCalledWith(
      expect.objectContaining({
        jti: 'r1',
        tokenType: TokenType.REFRESH,
        reason: 'logout',
      }),
      expect.anything(),
    );
    expect(blacklist.add).toHaveBeenCalledWith(
      expect.objectContaining({
        jti: 'a1',
        tokenType: TokenType.ACCESS,
        reason: 'logout',
      }),
      expect.anything(),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'auth.logout' }),
    );
  });

  it('no vuelve a agregar un jti que ya está en la blacklist', async () => {
    tokenService.verifyRefresh.mockResolvedValue({
      sub: 'user-1',
      type: TokenType.REFRESH,
      jti: 'r1',
    });
    blacklist.existsByJti.mockResolvedValue(true);

    await useCase.execute({
      refreshToken: 'refresh.jwt',
      ip: '127.0.0.1',
      userAgent: 'jest',
    });

    expect(tokens.revoke).toHaveBeenCalledWith('r1', expect.anything());
    expect(blacklist.add).not.toHaveBeenCalled();
  });
});
