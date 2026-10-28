import { HttpStatus } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { Role } from '@/common/types/role.enum';
import { UserStatus } from '@/common/types/user-status.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { LegalReconsentService } from '@/modules/legal/services/legal-reconsent.service';
import { User } from '@/modules/iam/users/entities/user.entity';
import { IUserRepository } from '@/modules/iam/users/repositories/user.repository.interface';
import { ITokenUserRepository } from '@/modules/iam/users/repositories/token-user.repository.interface';
import { PasswordHasherService } from '@/modules/iam/auth/services/password-hasher.service';
import { SessionService } from '@/modules/iam/auth/services/session.service';
import { TokenService } from '@/modules/iam/auth/services/token.service';
import { LoginUseCase } from '@/modules/iam/auth/use-cases/login.use-case';

function buildUser(overrides: Partial<User> = {}): User {
  const user = new User();
  user.id = 'user-1';
  user.email = 'persona@test.io';
  user.passwordHash = 'hashed';
  user.role = Role.CANDIDATE;
  user.status = UserStatus.ACTIVE;
  user.failedAttempts = 0;
  user.blockedUntil = null;
  user.emailVerifiedAt = new Date('2026-01-01T00:00:00Z');
  return Object.assign(user, overrides);
}

function errorCodeOf(exception: unknown): string | undefined {
  if (exception instanceof AppException) {
    return (exception.getResponse() as { errorCode?: string }).errorCode;
  }
  return undefined;
}

describe('LoginUseCase', () => {
  let users: jest.Mocked<IUserRepository>;
  let tokens: jest.Mocked<ITokenUserRepository>;
  let hasher: jest.Mocked<PasswordHasherService>;
  let tokenService: jest.Mocked<TokenService>;
  let audit: jest.Mocked<AuditService>;
  let reconsent: jest.Mocked<LegalReconsentService>;
  let dataSource: DataSource;
  let useCase: LoginUseCase;

  const command = (overrides: Record<string, unknown> = {}) => ({
    email: 'persona@test.io',
    password: 'Secreta#123',
    ip: '127.0.0.1',
    userAgent: 'jest',
    ...overrides,
  });

  beforeEach(() => {
    users = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      save: jest.fn((u: User) => Promise.resolve(u)),
    };
    tokens = {
      create: jest.fn(),
      findByJti: jest.fn(),
      revoke: jest.fn(),
    };
    hasher = {
      hash: jest.fn(),
      compare: jest.fn(),
    };
    tokenService = {
      signAccess: jest.fn().mockResolvedValue({
        token: 'access.jwt',
        jti: 'a1',
        expiresAt: new Date(Date.now() + 900_000),
      }),
      signRefresh: jest.fn().mockResolvedValue({
        token: 'refresh.jwt',
        jti: 'r1',
        expiresAt: new Date(Date.now() + 604_800_000),
      }),
    } as unknown as jest.Mocked<TokenService>;
    audit = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;
    dataSource = {
      transaction: jest.fn(async (work: (m: unknown) => Promise<unknown>) =>
        work({}),
      ),
    } as unknown as DataSource;

    // El servicio de sesión va real (con los mocks de alrededor): la emisión
    // de tokens es parte del contrato del login, no un detalle a ocultar.
    const session = new SessionService(
      users,
      tokens,
      tokenService,
      audit,
      dataSource,
    );
    reconsent = {
      requireCurrentVersions: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<LegalReconsentService>;

    useCase = new LoginUseCase(users, hasher, session, audit, reconsent);
  });

  it('pide aceptar la versión vigente antes de emitir la sesión', async () => {
    const user = buildUser();
    users.findByEmail.mockResolvedValue(user);
    hasher.compare.mockResolvedValue(true);

    reconsent.requireCurrentVersions.mockRejectedValue(
      new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.LEGAL_VERSION_OUTDATED,
        'Actualizamos los Términos.',
      ),
    );

    await expect(
      useCase.execute({
        email: user.email,
        password: 'Secreta#123',
        ip: '127.0.0.1',
        userAgent: 'jest',
      }),
    ).rejects.toThrow(AppException);

    expect(reconsent.requireCurrentVersions).toHaveBeenCalledWith(
      expect.objectContaining({ userId: user.id, email: user.email }),
    );
  });

  it('no consulta el re-consentimiento si la contraseña es incorrecta', async () => {
    const user = buildUser();
    users.findByEmail.mockResolvedValue(user);
    hasher.compare.mockResolvedValue(false);

    await expect(
      useCase.execute({
        email: user.email,
        password: 'mala',
        ip: '127.0.0.1',
        userAgent: 'jest',
      }),
    ).rejects.toThrow(AppException);

    // No se le dice a un desconocido que tiene documentos desactualizados.
    expect(reconsent.requireCurrentVersions).not.toHaveBeenCalled();
  });

  it('emite tokens en login exitoso y reinicia los intentos', async () => {
    const user = buildUser({ failedAttempts: 2 });
    users.findByEmail.mockResolvedValue(user);
    hasher.compare.mockResolvedValue(true);

    const result = await useCase.execute(command());

    expect(result.accessToken).toBe('access.jwt');
    expect(result.refreshToken).toBe('refresh.jwt');
    expect(result.user).toEqual({
      id: 'user-1',
      email: 'persona@test.io',
      role: Role.CANDIDATE,
    });
    expect(user.failedAttempts).toBe(0);
    expect(user.lastLogin).toBeInstanceOf(Date);
    expect(tokens.create).toHaveBeenCalledTimes(1);
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'auth.login.success' }),
    );
  });

  it('rechaza una cuenta de empresa desde la pestaña de candidato', async () => {
    const user = buildUser({ role: Role.EMPLOYER });
    users.findByEmail.mockResolvedValue(user);
    hasher.compare.mockResolvedValue(true);

    let error: unknown;
    try {
      await useCase.execute(command({ accountType: 'candidate' }));
    } catch (caught) {
      error = caught;
    }

    expect(errorCodeOf(error)).toBe(ErrorCode.AUTH_WRONG_ACCOUNT_TYPE);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'auth.login.wrong_account_type',
        actorUserId: user.id,
      }),
    );
    expect(tokens.create).not.toHaveBeenCalled();
  });

  it('permite entrar a un ADMIN desde cualquiera de las dos pestañas', async () => {
    const user = buildUser({ role: Role.ADMIN });
    users.findByEmail.mockResolvedValue(user);
    hasher.compare.mockResolvedValue(true);

    const result = await useCase.execute(command({ accountType: 'company' }));

    expect(result.user.role).toBe(Role.ADMIN);
  });

  it('bloquea la cuenta por 3 minutos tras 3 intentos fallidos', async () => {
    const user = buildUser();
    users.findByEmail.mockResolvedValue(user);
    hasher.compare.mockResolvedValue(false);

    await expect(useCase.execute(command())).rejects.toBeInstanceOf(
      AppException,
    );
    expect(user.failedAttempts).toBe(1);

    await expect(useCase.execute(command())).rejects.toBeInstanceOf(
      AppException,
    );
    expect(user.failedAttempts).toBe(2);

    const third = await useCase.execute(command()).catch((e: unknown) => e);
    expect(third).toBeInstanceOf(AppException);
    expect((third as AppException).getStatus()).toBe(423);
    expect(errorCodeOf(third)).toBe(ErrorCode.AUTH_ACCOUNT_BLOCKED);
    expect(user.blockedUntil).toBeInstanceOf(Date);

    // Aun con la contraseña correcta, sigue bloqueada y no se comprueba la clave.
    hasher.compare.mockResolvedValue(true);
    const blocked = await useCase.execute(command()).catch((e: unknown) => e);
    expect((blocked as AppException).getStatus()).toBe(423);
    expect(errorCodeOf(blocked)).toBe(ErrorCode.AUTH_ACCOUNT_BLOCKED);
    expect(hasher.compare).toHaveBeenCalledTimes(3);
  });

  it('rechaza el login si el correo no está verificado', async () => {
    const user = buildUser({ emailVerifiedAt: null });
    users.findByEmail.mockResolvedValue(user);
    hasher.compare.mockResolvedValue(true);

    const thrown = await useCase.execute(command()).catch((e: unknown) => e);
    expect(thrown).toBeInstanceOf(AppException);
    expect((thrown as AppException).getStatus()).toBe(403);
    expect(errorCodeOf(thrown)).toBe(ErrorCode.AUTH_EMAIL_NOT_VERIFIED);
    expect(tokens.create).not.toHaveBeenCalled();
  });

  it('devuelve credenciales inválidas genéricas si el usuario no existe', async () => {
    users.findByEmail.mockResolvedValue(null);

    const thrown = await useCase.execute(command()).catch((e: unknown) => e);
    expect((thrown as AppException).getStatus()).toBe(401);
    expect(errorCodeOf(thrown)).toBe(ErrorCode.AUTH_INVALID_CREDENTIALS);
    expect(hasher.compare).not.toHaveBeenCalled();
  });
});
