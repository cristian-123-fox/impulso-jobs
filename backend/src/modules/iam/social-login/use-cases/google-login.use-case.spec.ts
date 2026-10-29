import { HttpStatus } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { Role } from '@/common/types/role.enum';
import { UserStatus } from '@/common/types/user-status.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { CandidateProfile } from '@/modules/candidates/entities/candidate-profile.entity';
import { ICandidateProfileRepository } from '@/modules/candidates/repositories/candidate-profile.repository.interface';
import { PasswordHasherService } from '@/modules/iam/auth/services/password-hasher.service';
import { SessionService } from '@/modules/iam/auth/services/session.service';
import { IRoleRepository } from '@/modules/iam/roles/repositories/role.repository.interface';
import {
  GoogleIdentity,
  GoogleTokenVerifier,
} from '@/modules/iam/social-login/services/google-token-verifier.service';
import { GoogleLoginUseCase } from '@/modules/iam/social-login/use-cases/google-login.use-case';
import { LegalDocumentCode } from '@/modules/legal/enums/legal.enums';
import { RecordConsentUseCase } from '@/modules/legal/use-cases/record-consent.use-case';
import { User } from '@/modules/iam/users/entities/user.entity';
import { IUserRepository } from '@/modules/iam/users/repositories/user.repository.interface';
import { IUserRoleRepository } from '@/modules/iam/users/repositories/user-role.repository.interface';

function identity(overrides: Partial<GoogleIdentity> = {}): GoogleIdentity {
  return {
    sub: 'google-sub-1',
    email: 'persona@gmail.com',
    name: 'Ana Perez',
    givenName: 'Ana',
    familyName: 'Perez',
    picture: 'https://lh3.googleusercontent.com/a/foto',
    locale: 'es-MX',
    ...overrides,
  };
}

function errorCodeOf(exception: unknown): string | undefined {
  if (exception instanceof AppException) {
    return (exception.getResponse() as { errorCode?: string }).errorCode;
  }
  return undefined;
}

describe('GoogleLoginUseCase', () => {
  let users: jest.Mocked<IUserRepository>;
  let userRoles: jest.Mocked<IUserRoleRepository>;
  let roles: jest.Mocked<IRoleRepository>;
  let candidates: jest.Mocked<ICandidateProfileRepository>;
  let verifier: jest.Mocked<GoogleTokenVerifier>;
  let hasher: jest.Mocked<PasswordHasherService>;
  let session: jest.Mocked<SessionService>;
  let recordConsent: jest.Mocked<RecordConsentUseCase>;
  let audit: jest.Mocked<AuditService>;
  let dataSource: DataSource;
  let useCase: GoogleLoginUseCase;

  const command = (overrides: Record<string, unknown> = {}) => ({
    credential: 'id-token-de-google',
    ip: '127.0.0.1',
    userAgent: 'jest',
    ...overrides,
  });

  /**
   * `POST /auth/google` crea la cuenta si no existe, así que el alta sí exige
   * aceptación. El payload por defecto es lo que manda el formulario de login.
   */
  const commandCreatingAccount = (overrides: Record<string, unknown> = {}) =>
    command({
      legal: {
        documents: [
          { code: LegalDocumentCode.TERMS, version: '1.0.0', granted: true },
          { code: LegalDocumentCode.PRIVACY, version: '1.0.0', granted: true },
          {
            code: LegalDocumentCode.MARKETING,
            version: '1.0.0',
            granted: false,
          },
        ],
      },
      ...overrides,
    });

  beforeEach(() => {
    users = {
      findByEmail: jest.fn(),
      findByGoogleId: jest.fn(),
      // El id lo genera TypeORM en @BeforeInsert: el mock lo simula.
      save: jest.fn((u: User) => {
        u.id ??= 'user-1';
        return Promise.resolve(u);
      }),
    } as unknown as jest.Mocked<IUserRepository>;
    userRoles = {
      add: jest.fn(),
    } as unknown as jest.Mocked<IUserRoleRepository>;
    roles = {
      findByCode: jest.fn().mockResolvedValue({ id: 'role-1' }),
    } as unknown as jest.Mocked<IRoleRepository>;
    candidates = {
      findByUserId: jest.fn().mockResolvedValue(null),
      save: jest.fn((p: CandidateProfile) => Promise.resolve(p)),
    } as unknown as jest.Mocked<ICandidateProfileRepository>;
    verifier = {
      verify: jest.fn().mockResolvedValue(identity()),
    } as unknown as jest.Mocked<GoogleTokenVerifier>;
    hasher = {
      hash: jest.fn().mockResolvedValue('hash.aleatorio'),
      compare: jest.fn(),
    };
    session = {
      issue: jest.fn().mockResolvedValue({
        accessToken: 'access.jwt',
        refreshToken: 'refresh.jwt',
        user: {
          id: 'user-1',
          email: 'persona@gmail.com',
          role: Role.CANDIDATE,
        },
      }),
    } as unknown as jest.Mocked<SessionService>;
    audit = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;
    dataSource = {
      transaction: jest.fn(async (work: (m: unknown) => Promise<unknown>) =>
        work({}),
      ),
    } as unknown as DataSource;

    recordConsent = {
      execute: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<RecordConsentUseCase>;

    useCase = new GoogleLoginUseCase(
      users,
      userRoles,
      roles,
      candidates,
      recordConsent,
      verifier,
      hasher,
      session,
      audit,
      dataSource,
    );
  });

  it('no crea cuenta desde el login si no hay consentimiento de registro', async () => {
    users.findByGoogleId.mockResolvedValue(null);
    users.findByEmail.mockResolvedValue(null);

    let error: unknown;
    try {
      await useCase.execute(command());
    } catch (caught) {
      error = caught;
    }

    expect(errorCodeOf(error)).toBe(ErrorCode.AUTH_GOOGLE_SIGNUP_REQUIRED);
    expect(users.save).not.toHaveBeenCalled();
  });

  it('crea la cuenta de candidato cuando el correo no existe', async () => {
    users.findByGoogleId.mockResolvedValue(null);
    users.findByEmail.mockResolvedValue(null);

    const result = await useCase.execute(commandCreatingAccount());

    expect(result.accessToken).toBe('access.jwt');
    const saved = users.save.mock.calls[0][0];
    expect(saved.email).toBe('persona@gmail.com');
    expect(saved.googleId).toBe('google-sub-1');
    expect(saved.role).toBe(Role.CANDIDATE);
    expect(saved.status).toBe(UserStatus.ACTIVE);
    // El correo llega verificado por Google: no hay magic link que mandar.
    expect(saved.emailVerifiedAt).toBeInstanceOf(Date);
    // Clave aleatoria desconocida: el login por contraseña nunca la acierta.
    expect(hasher.hash).toHaveBeenCalledTimes(1);
    expect(userRoles.add).toHaveBeenCalledWith(
      'user-1',
      'role-1',
      expect.anything(),
    );

    const profile = candidates.save.mock.calls[0][0];
    expect(profile.firstName).toBe('Ana');
    expect(profile.lastName).toBe('Perez');
    expect(profile.country).toBe('MX');
    // Google no conoce documento ni fecha de nacimiento: quedan en null.
    expect(profile.documentType).toBeNull();
    expect(profile.documentNumber).toBeNull();
    expect(profile.birthDate).toBeNull();

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'auth.register',
        metadata: expect.objectContaining({ provider: 'google' }),
      }),
      expect.anything(),
    );
    expect(session.issue).toHaveBeenCalledTimes(1);
  });

  it('vincula Google a la cuenta existente sin duplicarla', async () => {
    const existing = new User();
    existing.id = 'user-9';
    existing.email = 'persona@gmail.com';
    existing.role = Role.CANDIDATE;
    existing.status = UserStatus.ACTIVE;
    existing.passwordHash = 'hash.de.la.clave';
    existing.emailVerifiedAt = null;
    existing.googleId = null;
    users.findByGoogleId.mockResolvedValue(null);
    users.findByEmail.mockResolvedValue(existing);
    candidates.findByUserId.mockResolvedValue({} as CandidateProfile);

    await useCase.execute(command());

    expect(existing.googleId).toBe('google-sub-1');
    expect(existing.emailVerifiedAt).toBeInstanceOf(Date);
    expect(users.save).not.toHaveBeenCalled(); // sólo la emite la sesión
    expect(candidates.save).not.toHaveBeenCalled();
    expect(session.issue).toHaveBeenCalledWith(existing, {
      ip: '127.0.0.1',
      userAgent: 'jest',
    });
  });

  it('prioriza el sub de Google cuando el correo cambió', async () => {
    const existing = new User();
    existing.id = 'user-9';
    existing.email = 'correo.viejo@gmail.com';
    existing.role = Role.CANDIDATE;
    existing.status = UserStatus.ACTIVE;
    existing.passwordHash = 'hash.de.la.clave';
    users.findByGoogleId.mockResolvedValue(existing);
    users.findByEmail.mockResolvedValue(null);
    candidates.findByUserId.mockResolvedValue({} as CandidateProfile);

    await useCase.execute(command());

    expect(users.findByEmail).toHaveBeenCalledWith('persona@gmail.com');
    expect(existing.email).toBe('persona@gmail.com');
  });

  it('rechaza cuentas bloqueadas e inactivas igual que el login por contraseña', async () => {
    const blocked = new User();
    blocked.id = 'user-9';
    blocked.email = 'persona@gmail.com';
    blocked.role = Role.CANDIDATE;
    blocked.status = UserStatus.ACTIVE;
    blocked.blockedUntil = new Date(Date.now() + 60_000);
    users.findByGoogleId.mockResolvedValue(blocked);

    const thrownBlocked = await useCase.execute(command()).catch((e) => e);
    expect((thrownBlocked as AppException).getStatus()).toBe(423);
    expect(errorCodeOf(thrownBlocked)).toBe(ErrorCode.AUTH_ACCOUNT_BLOCKED);

    blocked.blockedUntil = null;
    blocked.status = UserStatus.INACTIVE;
    const thrownInactive = await useCase.execute(command()).catch((e) => e);
    expect((thrownInactive as AppException).getStatus()).toBe(403);
    expect(errorCodeOf(thrownInactive)).toBe(ErrorCode.AUTH_ACCOUNT_INACTIVE);

    expect(session.issue).not.toHaveBeenCalled();
  });

  it('propaga el error del verificador cuando el token no vale', async () => {
    verifier.verify.mockRejectedValue(
      new AppException(
        401,
        ErrorCode.AUTH_GOOGLE_INVALID_TOKEN,
        'No se pudo validar la sesión de Google.',
      ),
    );

    const thrown = await useCase.execute(command()).catch((e) => e);
    expect(errorCodeOf(thrown)).toBe(ErrorCode.AUTH_GOOGLE_INVALID_TOKEN);
    expect(users.findByGoogleId).not.toHaveBeenCalled();
    expect(session.issue).not.toHaveBeenCalled();
  });
});
