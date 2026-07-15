import { ConfigService } from '@nestjs/config';
import { UserStatus } from '@/common/types/user-status.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { User } from '@/modules/iam/users/entities/user.entity';
import { IUserRepository } from '@/modules/iam/users/repositories/user.repository.interface';
import { TokenService } from '@/modules/iam/auth/services/token.service';
import { MailerPort } from '@/modules/iam/auth/services/mailer.port';
import {
  MAX_VERIFICATION_REQUESTS,
  RequestEmailVerificationUseCase,
} from '@/modules/iam/auth/use-cases/request-email-verification.use-case';

function buildUser(overrides: Partial<User> = {}): User {
  return Object.assign(
    new User(),
    {
      id: 'user-1',
      email: 'persona@test.io',
      status: UserStatus.ACTIVE,
      emailVerifiedAt: null,
      emailVerificationAttempts: 0,
      emailVerificationWindowStart: null,
    },
    overrides,
  );
}

describe('RequestEmailVerificationUseCase', () => {
  let users: jest.Mocked<IUserRepository>;
  let tokenService: jest.Mocked<TokenService>;
  let mailer: jest.Mocked<MailerPort>;
  let audit: jest.Mocked<AuditService>;
  let useCase: RequestEmailVerificationUseCase;

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
      signEmailVerification: jest.fn().mockResolvedValue({
        token: 'verify.jwt',
        jti: 'j',
        expiresAt: new Date(),
      }),
    } as unknown as jest.Mocked<TokenService>;
    mailer = {
      sendPasswordReset: jest.fn(),
      sendEmailVerification: jest.fn().mockResolvedValue(undefined),
    };
    audit = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;
    const config = {
      get: jest.fn().mockReturnValue('http://localhost:4200'),
    } as unknown as ConfigService;

    useCase = new RequestEmailVerificationUseCase(
      users,
      tokenService,
      mailer,
      audit,
      config,
    );
  });

  it('envía el enlace a un usuario activo sin verificar dentro del límite', async () => {
    const user = buildUser();
    users.findByEmail.mockResolvedValue(user);

    await useCase.execute(command);

    expect(user.emailVerificationAttempts).toBe(1);
    expect(mailer.sendEmailVerification).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'persona@test.io',
        link: expect.stringContaining('/auth/verificar-email?token=verify.jwt'),
      }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'email_verification.resend.sent' }),
    );
  });

  it('no envía nada (genérico) si el usuario no existe o está inactivo', async () => {
    users.findByEmail.mockResolvedValue(null);
    await useCase.execute(command);
    expect(mailer.sendEmailVerification).not.toHaveBeenCalled();

    users.findByEmail.mockResolvedValue(
      buildUser({ status: UserStatus.INACTIVE }),
    );
    await useCase.execute(command);
    expect(mailer.sendEmailVerification).not.toHaveBeenCalled();
  });

  it('no reenvía si el correo ya está verificado', async () => {
    users.findByEmail.mockResolvedValue(
      buildUser({ emailVerifiedAt: new Date() }),
    );

    await useCase.execute(command);

    expect(mailer.sendEmailVerification).not.toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'email_verification.resend.already_verified',
      }),
    );
  });

  it('respeta el límite de 3 reenvíos por ventana de 24h', async () => {
    const user = buildUser({
      emailVerificationAttempts: MAX_VERIFICATION_REQUESTS,
      emailVerificationWindowStart: new Date(),
    });
    users.findByEmail.mockResolvedValue(user);

    await useCase.execute(command);

    expect(mailer.sendEmailVerification).not.toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'email_verification.resend.rate_limited',
      }),
    );
  });

  it('reinicia la ventana si la anterior expiró (>24h)', async () => {
    const user = buildUser({
      emailVerificationAttempts: MAX_VERIFICATION_REQUESTS,
      emailVerificationWindowStart: new Date(Date.now() - 25 * 60 * 60 * 1000),
    });
    users.findByEmail.mockResolvedValue(user);

    await useCase.execute(command);

    expect(user.emailVerificationAttempts).toBe(1);
    expect(mailer.sendEmailVerification).toHaveBeenCalledTimes(1);
  });
});
