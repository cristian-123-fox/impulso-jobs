import { ConfigService } from '@nestjs/config';
import { UserStatus } from '@/common/types/user-status.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { User } from '@/modules/iam/users/entities/user.entity';
import { IUserRepository } from '@/modules/iam/users/repositories/user.repository.interface';
import { TokenService } from '@/modules/iam/auth/services/token.service';
import { MailerPort } from '@/modules/iam/auth/services/mailer.port';
import {
  MAX_RESET_REQUESTS,
  RequestPasswordResetUseCase,
} from '@/modules/iam/auth/use-cases/request-password-reset.use-case';

function buildUser(overrides: Partial<User> = {}): User {
  return Object.assign(
    new User(),
    {
      id: 'user-1',
      email: 'persona@test.io',
      status: UserStatus.ACTIVE,
      blockedUntil: null,
      passwordResetAttempts: 0,
      passwordResetWindowStart: null,
    },
    overrides,
  );
}

describe('RequestPasswordResetUseCase', () => {
  let users: jest.Mocked<IUserRepository>;
  let tokenService: jest.Mocked<TokenService>;
  let mailer: jest.Mocked<MailerPort>;
  let audit: jest.Mocked<AuditService>;
  let useCase: RequestPasswordResetUseCase;

  const command = {
    email: 'persona@test.io',
    ip: '127.0.0.1',
    userAgent: 'jest',
  };

  beforeEach(() => {
    users = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      save: jest.fn((u: User) => Promise.resolve(u)),
    };
    tokenService = {
      signReset: jest.fn().mockResolvedValue({
        token: 'reset.jwt',
        jti: 'j',
        expiresAt: new Date(),
      }),
    } as unknown as jest.Mocked<TokenService>;
    mailer = { sendPasswordReset: jest.fn().mockResolvedValue(undefined) };
    audit = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;
    const config = {
      get: jest.fn().mockReturnValue('http://localhost:4200'),
    } as unknown as ConfigService;

    useCase = new RequestPasswordResetUseCase(
      users,
      tokenService,
      mailer,
      audit,
      config,
    );
  });

  it('envía el enlace a un usuario activo dentro del límite', async () => {
    const user = buildUser();
    users.findByEmail.mockResolvedValue(user);

    await useCase.execute(command);

    expect(user.passwordResetAttempts).toBe(1);
    expect(mailer.sendPasswordReset).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'persona@test.io',
        link: expect.stringContaining(
          '/auth/restablecer-password?token=reset.jwt',
        ),
      }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'password_reset.request.sent' }),
    );
  });

  it('no envía nada (respuesta genérica) si el usuario no existe o está inactivo', async () => {
    users.findByEmail.mockResolvedValue(null);
    await useCase.execute(command);
    expect(mailer.sendPasswordReset).not.toHaveBeenCalled();

    users.findByEmail.mockResolvedValue(
      buildUser({ status: UserStatus.INACTIVE }),
    );
    await useCase.execute(command);
    expect(mailer.sendPasswordReset).not.toHaveBeenCalled();
  });

  it('respeta el límite de 3 solicitudes por ventana de 24h', async () => {
    const user = buildUser({
      passwordResetAttempts: MAX_RESET_REQUESTS,
      passwordResetWindowStart: new Date(),
    });
    users.findByEmail.mockResolvedValue(user);

    await useCase.execute(command);

    expect(mailer.sendPasswordReset).not.toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'password_reset.request.rate_limited',
      }),
    );
  });

  it('reinicia la ventana si la anterior expiró (>24h)', async () => {
    const user = buildUser({
      passwordResetAttempts: MAX_RESET_REQUESTS,
      passwordResetWindowStart: new Date(Date.now() - 25 * 60 * 60 * 1000),
    });
    users.findByEmail.mockResolvedValue(user);

    await useCase.execute(command);

    expect(user.passwordResetAttempts).toBe(1);
    expect(mailer.sendPasswordReset).toHaveBeenCalledTimes(1);
  });
});
