import { DataSource } from 'typeorm';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { Role } from '@/common/types/role.enum';
import { UserStatus } from '@/common/types/user-status.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { ICandidateProfileRepository } from '@/modules/candidates/repositories/candidate-profile.repository.interface';
import { RestoreAccountUseCase } from '@/modules/iam/account/use-cases/restore-account.use-case';
import { User } from '@/modules/iam/users/entities/user.entity';
import { IUserRepository } from '@/modules/iam/users/repositories/user.repository.interface';

function errorCodeOf(e: unknown): string | undefined {
  return e instanceof AppException
    ? (e.getResponse() as { errorCode?: string }).errorCode
    : undefined;
}

function user(deletedAt: Date | null): User {
  return Object.assign(new User(), {
    id: 'user-1',
    email: 'ana@example.com',
    role: Role.CANDIDATE,
    status: UserStatus.ACTIVE,
    deletedAt,
  });
}

const actor = {
  actorUserId: 'admin-1',
  ip: '127.0.0.1',
  userAgent: 'jest',
};

describe('RestoreAccountUseCase', () => {
  let dataSource: DataSource;
  let users: jest.Mocked<IUserRepository>;
  let profiles: jest.Mocked<ICandidateProfileRepository>;
  let audit: jest.Mocked<AuditService>;
  let useCase: RestoreAccountUseCase;

  beforeEach(() => {
    dataSource = {
      transaction: jest.fn((work: (m: unknown) => Promise<unknown>) =>
        work({}),
      ),
    } as unknown as DataSource;

    users = {
      findByIdIncludingDeleted: jest
        .fn()
        .mockResolvedValue(user(new Date('2026-01-01'))),
      restore: jest.fn(),
    } as unknown as jest.Mocked<IUserRepository>;

    profiles = {
      restoreByUserId: jest.fn(),
    } as unknown as jest.Mocked<ICandidateProfileRepository>;

    audit = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;

    useCase = new RestoreAccountUseCase(users, profiles, audit, dataSource);
  });

  it('restaura el usuario y su perfil, y lo audita', async () => {
    await useCase.execute({ id: 'user-1', ...actor });

    expect(users.restore).toHaveBeenCalledWith('user-1', expect.anything());
    expect(profiles.restoreByUserId).toHaveBeenCalledWith(
      'user-1',
      expect.anything(),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'account.restore',
        actorUserId: 'admin-1',
      }),
      expect.anything(),
    );
  });

  it('rechaza restaurar una cuenta que no está dada de baja', async () => {
    users.findByIdIncludingDeleted.mockResolvedValue(user(null));

    try {
      await useCase.execute({ id: 'user-1', ...actor });
      fail('debió lanzar');
    } catch (e) {
      expect(errorCodeOf(e)).toBe(ErrorCode.ACCOUNT_NOT_DELETED);
    }
    expect(users.restore).not.toHaveBeenCalled();
  });

  it('404 si el usuario no existe ni entre los borrados', async () => {
    users.findByIdIncludingDeleted.mockResolvedValue(null);

    try {
      await useCase.execute({ id: 'nope', ...actor });
      fail('debió lanzar');
    } catch (e) {
      expect(errorCodeOf(e)).toBe(ErrorCode.USER_NOT_FOUND);
    }
  });
});
