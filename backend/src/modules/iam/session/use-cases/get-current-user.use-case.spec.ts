import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { Role } from '@/common/types/role.enum';
import { UserStatus } from '@/common/types/user-status.enum';
import { CandidateProfile } from '@/modules/candidates/entities/candidate-profile.entity';
import { ICandidateProfileRepository } from '@/modules/candidates/repositories/candidate-profile.repository.interface';
import { Company } from '@/modules/companies/entities/company.entity';
import { CompanyUser } from '@/modules/companies/entities/company-user.entity';
import { ICompanyRepository } from '@/modules/companies/repositories/company.repository.interface';
import { ICompanyUserRepository } from '@/modules/companies/repositories/company-user.repository.interface';
import { GetCurrentUserUseCase } from '@/modules/iam/session/use-cases/get-current-user.use-case';
import { User } from '@/modules/iam/users/entities/user.entity';
import { IUserRepository } from '@/modules/iam/users/repositories/user.repository.interface';

function errorCodeOf(e: unknown): string | undefined {
  return e instanceof AppException
    ? (e.getResponse() as { errorCode?: string }).errorCode
    : undefined;
}

function user(role: Role, own: Partial<User> = {}): User {
  return Object.assign(new User(), {
    id: 'user-1',
    email: 'ana@example.com',
    role,
    status: UserStatus.ACTIVE,
    ...own,
  });
}

describe('GetCurrentUserUseCase', () => {
  let users: jest.Mocked<IUserRepository>;
  let candidates: jest.Mocked<ICandidateProfileRepository>;
  let companyUsers: jest.Mocked<ICompanyUserRepository>;
  let companies: jest.Mocked<ICompanyRepository>;
  let useCase: GetCurrentUserUseCase;

  beforeEach(() => {
    users = {
      findById: jest.fn().mockResolvedValue(user(Role.CANDIDATE)),
    } as unknown as jest.Mocked<IUserRepository>;
    candidates = {
      findByUserId: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<ICandidateProfileRepository>;
    companyUsers = {
      findByUserId: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<ICompanyUserRepository>;
    companies = {
      findById: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<ICompanyRepository>;

    useCase = new GetCurrentUserUseCase(
      users,
      candidates,
      companyUsers,
      companies,
    );
  });

  it('resuelve nombre y foto del candidato desde su perfil', async () => {
    candidates.findByUserId.mockResolvedValue(
      Object.assign(new CandidateProfile(), {
        firstName: 'Ana',
        lastName: 'López',
        profilePhotoUrl: 'https://cdn.test/foto.jpg',
      }),
    );

    await expect(useCase.execute('user-1')).resolves.toEqual({
      id: 'user-1',
      email: 'ana@example.com',
      role: Role.CANDIDATE,
      displayName: 'Ana López',
      avatarUrl: 'https://cdn.test/foto.jpg',
    });
  });

  it('resuelve nombre comercial y logo de la empresa del empleador', async () => {
    users.findById.mockResolvedValue(user(Role.EMPLOYER));
    companyUsers.findByUserId.mockResolvedValue(
      Object.assign(new CompanyUser(), { companyId: 'company-1' }),
    );
    companies.findById.mockResolvedValue(
      Object.assign(new Company(), {
        businessName: 'Impulso SA',
        logoUrl: 'https://cdn.test/logo.png',
      }),
    );

    const result = await useCase.execute('user-1');

    expect(companies.findById).toHaveBeenCalledWith('company-1');
    expect(result.displayName).toBe('Impulso SA');
    expect(result.avatarUrl).toBe('https://cdn.test/logo.png');
  });

  it('cae al correo cuando el perfil aún no tiene nombre (y en ADMIN)', async () => {
    users.findById.mockResolvedValue(user(Role.ADMIN));

    await expect(useCase.execute('user-1')).resolves.toEqual({
      id: 'user-1',
      email: 'ana@example.com',
      role: Role.ADMIN,
      displayName: 'ana@example.com',
      avatarUrl: null,
    });
    expect(candidates.findByUserId).not.toHaveBeenCalled();
    expect(companyUsers.findByUserId).not.toHaveBeenCalled();
  });

  it('usa la identidad de `users` cuando no hay perfil de dominio (ADMIN)', async () => {
    users.findById.mockResolvedValue(
      user(Role.ADMIN, {
        firstName: 'Óscar',
        lastName: 'Ruiz',
        photoUrl: 'https://cdn.test/oscar.png',
      }),
    );

    const result = await useCase.execute('user-1');

    expect(result.displayName).toBe('Óscar Ruiz');
    expect(result.avatarUrl).toBe('https://cdn.test/oscar.png');
  });

  /**
   * Nombre y foto siguen precedencias opuestas a propósito: el comercial dice
   * en representación de quién se actúa, la foto dice quién eres.
   */
  it('deja mandar al nombre comercial pero a la foto propia', async () => {
    users.findById.mockResolvedValue(
      user(Role.EMPLOYER, {
        firstName: 'Lucía',
        lastName: 'Mendoza',
        photoUrl: 'https://cdn.test/lucia.png',
      }),
    );
    companyUsers.findByUserId.mockResolvedValue(
      Object.assign(new CompanyUser(), { companyId: 'company-1' }),
    );
    companies.findById.mockResolvedValue(
      Object.assign(new Company(), {
        businessName: 'Impulso SA',
        logoUrl: 'https://cdn.test/logo.png',
      }),
    );

    const result = await useCase.execute('user-1');

    expect(result.displayName).toBe('Impulso SA');
    expect(result.avatarUrl).toBe('https://cdn.test/lucia.png');
  });

  it('cae al logo de la empresa si el empleador no subió su foto', async () => {
    users.findById.mockResolvedValue(user(Role.EMPLOYER));
    companyUsers.findByUserId.mockResolvedValue(
      Object.assign(new CompanyUser(), { companyId: 'company-1' }),
    );
    companies.findById.mockResolvedValue(
      Object.assign(new Company(), {
        businessName: 'Impulso SA',
        logoUrl: 'https://cdn.test/logo.png',
      }),
    );

    const result = await useCase.execute('user-1');

    expect(result.avatarUrl).toBe('https://cdn.test/logo.png');
  });

  it('no consulta la empresa si el empleador no tiene membresía', async () => {
    users.findById.mockResolvedValue(user(Role.EMPLOYER));

    const result = await useCase.execute('user-1');

    expect(companies.findById).not.toHaveBeenCalled();
    expect(result.displayName).toBe('ana@example.com');
    expect(result.avatarUrl).toBeNull();
  });

  it('rechaza si la cuenta ya no existe', async () => {
    users.findById.mockResolvedValue(null);

    expect.assertions(1);
    try {
      await useCase.execute('user-1');
    } catch (e) {
      expect(errorCodeOf(e)).toBe(ErrorCode.UNAUTHORIZED);
    }
  });
});
