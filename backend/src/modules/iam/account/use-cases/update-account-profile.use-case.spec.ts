import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { Role } from '@/common/types/role.enum';
import { UserStatus } from '@/common/types/user-status.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { UpdateAccountProfileUseCase } from '@/modules/iam/account/use-cases/update-account-profile.use-case';
import { User } from '@/modules/iam/users/entities/user.entity';
import { IUserRepository } from '@/modules/iam/users/repositories/user.repository.interface';

function errorCodeOf(e: unknown): string | undefined {
  return e instanceof AppException
    ? (e.getResponse() as { errorCode?: string }).errorCode
    : undefined;
}

function user(overrides: Partial<User> = {}): User {
  return Object.assign(new User(), {
    id: 'user-1',
    email: 'ana@example.com',
    passwordHash: 'hash',
    role: Role.ADMIN,
    status: UserStatus.ACTIVE,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    firstName: 'Ana',
    lastName: 'García',
    phone: '3312345678',
    jobTitle: 'Soporte',
    ...overrides,
  });
}

const base = { userId: 'user-1', ip: '127.0.0.1', userAgent: 'jest' };

describe('UpdateAccountProfileUseCase', () => {
  let users: jest.Mocked<IUserRepository>;
  let audit: jest.Mocked<AuditService>;
  let useCase: UpdateAccountProfileUseCase;
  let current: User;

  beforeEach(() => {
    current = user();

    users = {
      findById: jest.fn(() => Promise.resolve(current)),
      save: jest.fn((u: User) => Promise.resolve(u)),
    } as unknown as jest.Mocked<IUserRepository>;

    audit = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;

    useCase = new UpdateAccountProfileUseCase(users, audit);
  });

  it('actualiza los campos enviados y deja intactos los ausentes', async () => {
    const result = await useCase.execute({
      ...base,
      firstName: 'Oscar',
      jobTitle: 'Coordinador',
    });

    expect(result.firstName).toBe('Oscar');
    expect(result.jobTitle).toBe('Coordinador');
    // No viajaron en el comando: se conservan.
    expect(result.lastName).toBe('García');
    expect(result.phone).toBe('3312345678');
  });

  it('recorta los espacios', async () => {
    const result = await useCase.execute({ ...base, firstName: '  Oscar  ' });

    expect(result.firstName).toBe('Oscar');
  });

  /** Vaciar un campo opcional debe borrarlo, no guardar una cadena vacía. */
  it('deja el campo en null cuando llega en blanco', async () => {
    const result = await useCase.execute({ ...base, phone: '   ' });

    expect(result.phone).toBeNull();
  });

  it('no deja cambiar el correo: no es parte del comando', async () => {
    const result = await useCase.execute({ ...base, firstName: 'Oscar' });

    expect(result.email).toBe('ana@example.com');
  });

  it('registra la rectificación en auditoría', async () => {
    await useCase.execute({ ...base, firstName: 'Oscar' });

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'account.profile.update',
        actorUserId: 'user-1',
        entityId: 'user-1',
      }),
    );
  });

  it('rechaza una cuenta inexistente', async () => {
    users.findById.mockResolvedValue(null);

    const thrown = await useCase
      .execute({ ...base, firstName: 'Oscar' })
      .catch((e: unknown) => e);

    expect(errorCodeOf(thrown)).toBe(ErrorCode.UNAUTHORIZED);
  });
});
