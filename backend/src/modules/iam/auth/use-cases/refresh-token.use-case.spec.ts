import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { Role } from '@/common/types/role.enum';
import { TokenType } from '@/common/types/token-type.enum';
import { UserStatus } from '@/common/types/user-status.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { User } from '@/modules/iam/users/entities/user.entity';
import { TokenUser } from '@/modules/iam/users/entities/token-user.entity';
import { IUserRepository } from '@/modules/iam/users/repositories/user.repository.interface';
import { ITokenUserRepository } from '@/modules/iam/users/repositories/token-user.repository.interface';
import { IBlacklistTokenRepository } from '@/modules/iam/users/repositories/blacklist-token.repository.interface';
import { TokenService } from '@/modules/iam/auth/services/token.service';
import { RefreshTokenUseCase } from '@/modules/iam/auth/use-cases/refresh-token.use-case';

function errorCodeOf(exception: unknown): string | undefined {
  return exception instanceof AppException
    ? (exception.getResponse() as { errorCode?: string }).errorCode
    : undefined;
}

describe('RefreshTokenUseCase', () => {
  let users: jest.Mocked<IUserRepository>;
  let tokens: jest.Mocked<ITokenUserRepository>;
  let blacklist: jest.Mocked<IBlacklistTokenRepository>;
  let tokenService: jest.Mocked<TokenService>;
  let audit: jest.Mocked<AuditService>;
  let useCase: RefreshTokenUseCase;

  const command = {
    refreshToken: 'refresh.jwt',
    ip: '127.0.0.1',
    userAgent: 'jest',
  };

  const activeUser = (): User =>
    Object.assign(new User(), {
      id: 'user-1',
      email: 'persona@test.io',
      role: Role.CANDIDATE,
      status: UserStatus.ACTIVE,
      blockedUntil: null,
    });

  const storedToken = (): TokenUser =>
    Object.assign(new TokenUser(), {
      id: 'r1',
      userId: 'user-1',
      revoked: false,
      expiresAt: new Date(Date.now() + 604_800_000),
    });

  beforeEach(() => {
    users = { findById: jest.fn(), findByEmail: jest.fn(), save: jest.fn() };
    tokens = { findByJti: jest.fn(), create: jest.fn(), revoke: jest.fn() };
    blacklist = { existsByJti: jest.fn(), add: jest.fn() };
    tokenService = {
      verifyRefresh: jest.fn(),
      signAccess: jest.fn().mockResolvedValue({
        token: 'new.access.jwt',
        jti: 'a2',
        expiresAt: new Date(),
      }),
    } as unknown as jest.Mocked<TokenService>;
    audit = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;

    useCase = new RefreshTokenUseCase(
      users,
      tokens,
      blacklist,
      tokenService,
      audit,
    );
  });

  it('devuelve un nuevo access token con un refresh válido', async () => {
    tokenService.verifyRefresh.mockResolvedValue({
      sub: 'user-1',
      type: TokenType.REFRESH,
      jti: 'r1',
    });
    blacklist.existsByJti.mockResolvedValue(false);
    tokens.findByJti.mockResolvedValue(storedToken());
    users.findById.mockResolvedValue(activeUser());

    const result = await useCase.execute(command);

    expect(result.accessToken).toBe('new.access.jwt');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'auth.refresh' }),
    );
  });

  it('rechaza un refresh presente en la blacklist', async () => {
    tokenService.verifyRefresh.mockResolvedValue({
      sub: 'user-1',
      type: TokenType.REFRESH,
      jti: 'r1',
    });
    blacklist.existsByJti.mockResolvedValue(true);

    const thrown = await useCase.execute(command).catch((e: unknown) => e);
    expect((thrown as AppException).getStatus()).toBe(401);
    expect(errorCodeOf(thrown)).toBe(ErrorCode.AUTH_TOKEN_REVOKED);
    expect(tokenService.signAccess).not.toHaveBeenCalled();
  });

  it('rechaza un refresh revocado o desconocido', async () => {
    tokenService.verifyRefresh.mockResolvedValue({
      sub: 'user-1',
      type: TokenType.REFRESH,
      jti: 'r1',
    });
    blacklist.existsByJti.mockResolvedValue(false);
    tokens.findByJti.mockResolvedValue(null);

    const thrown = await useCase.execute(command).catch((e: unknown) => e);
    expect(errorCodeOf(thrown)).toBe(ErrorCode.AUTH_TOKEN_REVOKED);
  });

  it('rechaza un refresh con firma inválida', async () => {
    tokenService.verifyRefresh.mockRejectedValue(
      new Error('invalid signature'),
    );

    const thrown = await useCase.execute(command).catch((e: unknown) => e);
    expect((thrown as AppException).getStatus()).toBe(401);
    expect(errorCodeOf(thrown)).toBe(ErrorCode.AUTH_INVALID_REFRESH_TOKEN);
  });
});
