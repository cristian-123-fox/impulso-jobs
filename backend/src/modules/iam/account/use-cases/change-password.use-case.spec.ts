import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { Role } from '@/common/types/role.enum';
import { UserStatus } from '@/common/types/user-status.enum';
import { comparePassword, hashPassword } from '@/common/utils/password.util';
import { AuditService } from '@/modules/audit/audit.service';
import { ChangePasswordUseCase } from '@/modules/iam/account/use-cases/change-password.use-case';
import { User } from '@/modules/iam/users/entities/user.entity';
import { IUserRepository } from '@/modules/iam/users/repositories/user.repository.interface';

function errorCodeOf(e: unknown): string | undefined {
  return e instanceof AppException
    ? (e.getResponse() as { errorCode?: string }).errorCode
    : undefined;
}

const CURRENT = 'Actual123!';
const NEXT = 'Nueva456$';

async function user(overrides: Partial<User> = {}): Promise<User> {
  return Object.assign(new User(), {
    id: 'user-1',
    email: 'ana@example.com',
    passwordHash: await hashPassword(CURRENT),
    role: Role.ADMIN,
    status: UserStatus.ACTIVE,
    failedAttempts: 3,
    blockedUntil: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });
}

const base = { userId: 'user-1', ip: '127.0.0.1', userAgent: 'jest' };

describe('ChangePasswordUseCase', () => {
  let users: jest.Mocked<IUserRepository>;
  let audit: jest.Mocked<AuditService>;
  let useCase: ChangePasswordUseCase;
  let current: User;

  beforeEach(async () => {
    current = await user();

    users = {
      findById: jest.fn(() => Promise.resolve(current)),
      save: jest.fn((u: User) => Promise.resolve(u)),
    } as unknown as jest.Mocked<IUserRepository>;

    audit = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;

    useCase = new ChangePasswordUseCase(users, audit);
  });

  it('cambia la contraseña cuando la actual es correcta', async () => {
    await useCase.execute({
      ...base,
      currentPassword: CURRENT,
      newPassword: NEXT,
    });

    const saved = users.save.mock.calls[0][0];
    await expect(comparePassword(NEXT, saved.passwordHash)).resolves.toBe(true);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'account.password.change' }),
    );
  });

  it('invalida las sesiones vigentes moviendo tokensValidFrom', async () => {
    const before = Date.now();

    await useCase.execute({
      ...base,
      currentPassword: CURRENT,
      newPassword: NEXT,
    });

    const saved = users.save.mock.calls[0][0];
    expect(saved.tokensValidFrom).toBeInstanceOf(Date);
    expect(saved.tokensValidFrom!.getTime()).toBeGreaterThanOrEqual(before);
  });

  it('limpia el bloqueo por intentos fallidos', async () => {
    await useCase.execute({
      ...base,
      currentPassword: CURRENT,
      newPassword: NEXT,
    });

    const saved = users.save.mock.calls[0][0];
    expect(saved.failedAttempts).toBe(0);
    expect(saved.blockedUntil).toBeNull();
  });

  it('rechaza una contraseña actual incorrecta sin tocar la cuenta', async () => {
    const thrown = await useCase
      .execute({ ...base, currentPassword: 'Otra123!', newPassword: NEXT })
      .catch((e: unknown) => e);

    expect(errorCodeOf(thrown)).toBe(ErrorCode.AUTH_INVALID_CREDENTIALS);
    expect(users.save).not.toHaveBeenCalled();
  });

  /** Repetirla no aporta nada y dejaría al usuario fuera de su sesión. */
  it('rechaza repetir la contraseña actual', async () => {
    const thrown = await useCase
      .execute({ ...base, currentPassword: CURRENT, newPassword: CURRENT })
      .catch((e: unknown) => e);

    expect(errorCodeOf(thrown)).toBe(ErrorCode.CONFLICT);
    expect(users.save).not.toHaveBeenCalled();
  });

  it('rechaza una cuenta inexistente', async () => {
    users.findById.mockResolvedValue(null);

    const thrown = await useCase
      .execute({ ...base, currentPassword: CURRENT, newPassword: NEXT })
      .catch((e: unknown) => e);

    expect(errorCodeOf(thrown)).toBe(ErrorCode.UNAUTHORIZED);
  });
});
