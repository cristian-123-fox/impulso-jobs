import { DataSource } from 'typeorm';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { TokenType } from '@/common/types/token-type.enum';
import { UserStatus } from '@/common/types/user-status.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { User } from '@/modules/iam/users/entities/user.entity';
import { IUserRepository } from '@/modules/iam/users/repositories/user.repository.interface';
import { ITokenUserRepository } from '@/modules/iam/users/repositories/token-user.repository.interface';
import { IBlacklistTokenRepository } from '@/modules/iam/users/repositories/blacklist-token.repository.interface';
import { PasswordHasherService } from '@/modules/iam/auth/services/password-hasher.service';
import { TokenService } from '@/modules/iam/auth/services/token.service';
import { ConfirmPasswordResetUseCase } from '@/modules/iam/auth/use-cases/confirm-password-reset.use-case';

function errorCodeOf(e: unknown): string | undefined {
  return e instanceof AppException
    ? (e.getResponse() as { errorCode?: string }).errorCode
    : undefined;
}

function buildUser(): User {
  return Object.assign(new User(), {
    id: 'user-1',
    email: 'persona@test.io',
    passwordHash: 'old-hash',
    status: UserStatus.ACTIVE,
    failedAttempts: 2,
    blockedUntil: null,
  });
}

describe('ConfirmPasswordResetUseCase', () => {
  let users: jest.Mocked<IUserRepository>;
  let tokens: jest.Mocked<ITokenUserRepository>;
  let blacklist: jest.Mocked<IBlacklistTokenRepository>;
  let tokenService: jest.Mocked<TokenService>;
  let hasher: jest.Mocked<PasswordHasherService>;
  let audit: jest.Mocked<AuditService>;
  let dataSource: DataSource;
  let useCase: ConfirmPasswordResetUseCase;

  const command = {
    token: 'reset.jwt',
    newPassword: 'NuevaClave#123',
    confirmPassword: 'NuevaClave#123',
    ip: '127.0.0.1',
    userAgent: 'jest',
  };

  beforeEach(() => {
    users = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      save: jest.fn((u: User) => Promise.resolve(u)),
    };
    tokens = {
      revokeAllByUserId: jest.fn(),
      revoke: jest.fn(),
      create: jest.fn(),
      findByJti: jest.fn(),
    };
    blacklist = {
      existsByJti: jest.fn().mockResolvedValue(false),
      add: jest.fn(),
    };
    tokenService = {
      verifyReset: jest.fn().mockResolvedValue({
        sub: 'user-1',
        type: TokenType.RESET,
        jti: 'reset-jti',
      }),
    } as unknown as jest.Mocked<TokenService>;
    hasher = {
      hash: jest.fn().mockResolvedValue('new-hash'),
    } as unknown as jest.Mocked<PasswordHasherService>;
    audit = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;
    dataSource = {
      transaction: jest.fn((work: (m: unknown) => Promise<unknown>) =>
        work({}),
      ),
    } as unknown as DataSource;

    useCase = new ConfirmPasswordResetUseCase(
      users,
      tokens,
      blacklist,
      tokenService,
      hasher,
      audit,
      dataSource,
    );
  });

  it('actualiza el hash, invalida sesiones y consume el token', async () => {
    const user = buildUser();
    users.findById.mockResolvedValue(user);

    await useCase.execute(command);

    expect(user.passwordHash).toBe('new-hash');
    expect(user.tokensValidFrom).toBeInstanceOf(Date);
    expect(user.failedAttempts).toBe(0);
    expect(tokens.revokeAllByUserId).toHaveBeenCalledWith(
      'user-1',
      expect.anything(),
    );
    expect(blacklist.add).toHaveBeenCalledWith(
      expect.objectContaining({ jti: 'reset-jti', tokenType: TokenType.RESET }),
      expect.anything(),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'password_reset.confirm' }),
    );
  });

  it('rechaza si las contraseñas no coinciden', async () => {
    const thrown = await useCase
      .execute({ ...command, confirmPassword: 'Otra#123' })
      .catch((e: unknown) => e);
    expect((thrown as AppException).getStatus()).toBe(400);
    expect(errorCodeOf(thrown)).toBe(ErrorCode.AUTH_PASSWORD_MISMATCH);
    expect(tokenService.verifyReset).not.toHaveBeenCalled();
  });

  it('rechaza un token ya usado (en blacklist)', async () => {
    users.findById.mockResolvedValue(buildUser());
    blacklist.existsByJti.mockResolvedValue(true);

    const thrown = await useCase.execute(command).catch((e: unknown) => e);
    expect(errorCodeOf(thrown)).toBe(ErrorCode.AUTH_INVALID_RESET_TOKEN);
    expect(users.save).not.toHaveBeenCalled();
  });

  it('rechaza un token con firma inválida', async () => {
    tokenService.verifyReset.mockRejectedValue(new Error('invalid'));

    const thrown = await useCase.execute(command).catch((e: unknown) => e);
    expect(errorCodeOf(thrown)).toBe(ErrorCode.AUTH_INVALID_RESET_TOKEN);
  });
});
