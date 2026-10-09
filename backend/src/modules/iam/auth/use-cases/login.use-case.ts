import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { UserStatus } from '@/common/types/user-status.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { User } from '@/modules/iam/users/entities/user.entity';
import {
  type IUserRepository,
  USER_REPOSITORY,
} from '@/modules/iam/users/repositories/user.repository.interface';
import { PasswordHasherService } from '@/modules/iam/auth/services/password-hasher.service';
import {
  SessionResult,
  SessionService,
} from '@/modules/iam/auth/services/session.service';

export interface LoginCommand {
  email: string;
  password: string;
  ip: string;
  userAgent: string;
}

export type LoginResult = SessionResult;

export const MAX_FAILED_ATTEMPTS = 3;
export const BLOCK_MINUTES = 3;

/** HU-001: autentica credenciales aplicando bloqueo temporal y verificación. */
@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    private readonly hasher: PasswordHasherService,
    private readonly session: SessionService,
    private readonly audit: AuditService,
  ) {}

  async execute(command: LoginCommand): Promise<LoginResult> {
    const email = command.email.trim().toLowerCase();
    const user = await this.users.findByEmail(email);

    // Mensaje genérico: no revelar si el correo existe.
    if (!user) {
      await this.audit.record({
        action: 'auth.login.failed',
        entity: 'user',
        ip: command.ip,
        userAgent: command.userAgent,
        metadata: { email, reason: 'not_found' },
      });
      throw this.invalidCredentials();
    }

    // Bloqueo temporal vigente: no se comprueba la contraseña.
    if (user.blockedUntil && user.blockedUntil.getTime() > Date.now()) {
      await this.audit.record({
        action: 'auth.login.blocked',
        actorUserId: user.id,
        entity: 'user',
        entityId: user.id,
        ip: command.ip,
        userAgent: command.userAgent,
      });
      throw this.accountBlocked();
    }

    // Solo usuarios activos.
    if (user.status !== UserStatus.ACTIVE) {
      await this.audit.record({
        action: 'auth.login.inactive',
        actorUserId: user.id,
        entity: 'user',
        entityId: user.id,
        ip: command.ip,
        userAgent: command.userAgent,
        metadata: { status: user.status },
      });
      throw new AppException(
        HttpStatus.FORBIDDEN,
        ErrorCode.AUTH_ACCOUNT_INACTIVE,
        'Tu cuenta no está activa. Contacta a soporte.',
      );
    }

    const passwordOk = await this.hasher.compare(
      command.password,
      user.passwordHash,
    );
    if (!passwordOk) {
      return this.registerFailedAttempt(user, command);
    }

    // Credenciales correctas pero correo sin verificar → se bloquea el login.
    if (!user.emailVerifiedAt) {
      if (user.failedAttempts !== 0) {
        user.failedAttempts = 0;
        await this.users.save(user);
      }
      await this.audit.record({
        action: 'auth.login.unverified',
        actorUserId: user.id,
        entity: 'user',
        entityId: user.id,
        ip: command.ip,
        userAgent: command.userAgent,
      });
      throw new AppException(
        HttpStatus.FORBIDDEN,
        ErrorCode.AUTH_EMAIL_NOT_VERIFIED,
        'Debes verificar tu correo electrónico antes de iniciar sesión.',
      );
    }

    return this.session.issue(user, command);
  }

  private async registerFailedAttempt(
    user: User,
    command: LoginCommand,
  ): Promise<never> {
    user.failedAttempts += 1;
    let justBlocked = false;

    if (user.failedAttempts >= MAX_FAILED_ATTEMPTS) {
      user.blockedUntil = new Date(Date.now() + BLOCK_MINUTES * 60_000);
      user.failedAttempts = 0;
      justBlocked = true;
    }

    await this.users.save(user);
    await this.audit.record({
      action: 'auth.login.failed',
      actorUserId: user.id,
      entity: 'user',
      entityId: user.id,
      ip: command.ip,
      userAgent: command.userAgent,
      metadata: { blocked: justBlocked },
    });

    throw justBlocked ? this.accountBlocked() : this.invalidCredentials();
  }

  private invalidCredentials(): AppException {
    return new AppException(
      HttpStatus.UNAUTHORIZED,
      ErrorCode.AUTH_INVALID_CREDENTIALS,
      'Correo o contraseña incorrectos.',
    );
  }

  private accountBlocked(): AppException {
    return new AppException(
      HttpStatus.LOCKED,
      ErrorCode.AUTH_ACCOUNT_BLOCKED,
      `Cuenta bloqueada temporalmente por ${BLOCK_MINUTES} minutos tras ${MAX_FAILED_ATTEMPTS} intentos fallidos.`,
    );
  }
}
