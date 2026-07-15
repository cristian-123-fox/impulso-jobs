import { DataSource } from 'typeorm';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { TokenType } from '@/common/types/token-type.enum';
import { UserStatus } from '@/common/types/user-status.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { User } from '@/modules/iam/users/entities/user.entity';
import { IUserRepository } from '@/modules/iam/users/repositories/user.repository.interface';
import { IBlacklistTokenRepository } from '@/modules/iam/users/repositories/blacklist-token.repository.interface';
import { TokenService } from '@/modules/iam/auth/services/token.service';
import { ConfirmEmailVerificationUseCase } from '@/modules/iam/auth/use-cases/confirm-email-verification.use-case';

function errorCodeOf(e: unknown): string | undefined {
  return e instanceof AppException
    ? (e.getResponse() as { errorCode?: string }).errorCode
    : undefined;
}

function buildUser(overrides: Partial<User> = {}): User {
  return Object.assign(
    new User(),
    {
      id: 'user-1',
      email: 'persona@test.io',
      status: UserStatus.ACTIVE,
      emailVerifiedAt: null,
      emailVerificationAttempts: 2,
      emailVerificationWindowStart: new Date(),
    },
    overrides,
  );
}

describe('ConfirmEmailVerificationUseCase', () => {
  let users: jest.Mocked<IUserRepository>;
  let blacklist: jest.Mocked<IBlacklistTokenRepository>;
  let tokenService: jest.Mocked<TokenService>;
  let audit: jest.Mocked<AuditService>;
  let dataSource: DataSource;
  let useCase: ConfirmEmailVerificationUseCase;

  const command = { token: 'verify.jwt', ip: '127.0.0.1', userAgent: 'jest' };

  beforeEach(() => {
    users = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      save: jest.fn((u: User) => Promise.resolve(u)),
    };
    blacklist = {
      existsByJti: jest.fn().mockResolvedValue(false),
      add: jest.fn(),
    };
    tokenService = {
      verifyEmailVerification: jest.fn().mockResolvedValue({
        sub: 'user-1',
        type: TokenType.VERIFY,
        jti: 'verify-jti',
      }),
    } as unknown as jest.Mocked<TokenService>;
    audit = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;
    dataSource = {
      transaction: jest.fn((work: (m: unknown) => Promise<unknown>) =>
        work({}),
      ),
    } as unknown as DataSource;

    useCase = new ConfirmEmailVerificationUseCase(
      users,
      blacklist,
      tokenService,
      audit,
      dataSource,
    );
  });

  it('marca el timestamp y consume el token (verificación fresca)', async () => {
    const user = buildUser();
    users.findById.mockResolvedValue(user);

    const result = await useCase.execute(command);

    expect(result.alreadyVerified).toBe(false);
    expect(user.emailVerifiedAt).toBeInstanceOf(Date);
    expect(user.emailVerificationAttempts).toBe(0);
    expect(users.save).toHaveBeenCalled();
    expect(blacklist.add).toHaveBeenCalledWith(
      expect.objectContaining({
        jti: 'verify-jti',
        tokenType: TokenType.VERIFY,
      }),
      expect.anything(),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'email_verification.confirm' }),
    );
  });

  it('es idempotente si el correo ya estaba verificado', async () => {
    const verifiedAt = new Date('2020-01-01T00:00:00Z');
    const user = buildUser({ emailVerifiedAt: verifiedAt });
    users.findById.mockResolvedValue(user);

    const result = await useCase.execute(command);

    expect(result.alreadyVerified).toBe(true);
    // No se sobrescribe el timestamp original.
    expect(user.emailVerifiedAt).toBe(verifiedAt);
    expect(users.save).not.toHaveBeenCalled();
    // Pero el token igual se consume.
    expect(blacklist.add).toHaveBeenCalled();
  });

  it('rechaza un token ya usado (en blacklist)', async () => {
    users.findById.mockResolvedValue(buildUser());
    blacklist.existsByJti.mockResolvedValue(true);

    const thrown = await useCase.execute(command).catch((e: unknown) => e);
    expect(errorCodeOf(thrown)).toBe(ErrorCode.AUTH_INVALID_VERIFICATION_TOKEN);
    expect(users.save).not.toHaveBeenCalled();
  });

  it('rechaza un token con firma inválida', async () => {
    tokenService.verifyEmailVerification.mockRejectedValue(new Error('nope'));

    const thrown = await useCase.execute(command).catch((e: unknown) => e);
    expect(errorCodeOf(thrown)).toBe(ErrorCode.AUTH_INVALID_VERIFICATION_TOKEN);
  });

  it('rechaza un token de otro tipo', async () => {
    tokenService.verifyEmailVerification.mockResolvedValue({
      sub: 'user-1',
      type: TokenType.RESET,
      jti: 'x',
    } as never);

    const thrown = await useCase.execute(command).catch((e: unknown) => e);
    expect(errorCodeOf(thrown)).toBe(ErrorCode.AUTH_INVALID_VERIFICATION_TOKEN);
  });

  it('rechaza si el usuario no existe o está inactivo', async () => {
    users.findById.mockResolvedValue(null);
    const thrown = await useCase.execute(command).catch((e: unknown) => e);
    expect(errorCodeOf(thrown)).toBe(ErrorCode.AUTH_INVALID_VERIFICATION_TOKEN);
  });
});
