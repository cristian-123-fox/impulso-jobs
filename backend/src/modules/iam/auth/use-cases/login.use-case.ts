import { HttpStatus, Inject, Injectable, forwardRef } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { Role } from '@/common/types/role.enum';
import { UserStatus } from '@/common/types/user-status.enum';
import { LoginAccountType } from '@/modules/iam/auth/dto/login.dto';
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
import type { RegisterLegalDto } from '@/modules/iam/registration/dto/register.dto';
import { LegalReconsentService } from '@/modules/legal/services/legal-reconsent.service';

export interface LoginCommand {
  email: string;
  password: string;
  /** Pestaña Candidato/Empresa desde la que se intenta entrar. */
  accountType?: LoginAccountType;
  ip: string;
  userAgent: string;
  /** Sólo llega cuando el backend pidió aceptar una versión nueva. */
  legal?: RegisterLegalDto;
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
    @Inject(forwardRef(() => LegalReconsentService))
    private readonly legal: LegalReconsentService,
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

    // La pestaña elegida tiene que coincidir con el rol real. Se comprueba
    // después de la contraseña: antes, cualquiera podría averiguar si un correo
    // es de empresa o de candidato.
    if (command.accountType && user.role !== Role.ADMIN) {
      const expected =
        command.accountType === LoginAccountType.COMPANY
          ? Role.EMPLOYER
          : Role.CANDIDATE;
      if (user.role !== expected) {
        await this.audit.record({
          action: 'auth.login.wrong_account_type',
          actorUserId: user.id,
          entity: 'user',
          entityId: user.id,
          ip: command.ip,
          userAgent: command.userAgent,
          metadata: { accountType: command.accountType, role: user.role },
        });
        throw new AppException(
          HttpStatus.FORBIDDEN,
          ErrorCode.AUTH_WRONG_ACCOUNT_TYPE,
          user.role === Role.EMPLOYER
            ? 'Esta cuenta es de empresa. Entra desde la pestaña Empresa.'
            : 'Esta cuenta es de candidato. Entra desde la pestaña Candidato.',
        );
      }
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

    // Re-consentimiento, y sólo después de que la contraseña sea correcta: no
    // se le dice a alguien que tiene una versión desactualizada antes de
    // saber quién es. Si hay documentos nuevos por aceptar, esto responde 409
    // con `LEGAL_VERSION_OUTDATED` y el formulario vuelve a preguntar.
    await this.legal.requireCurrentVersions({
      userId: user.id,
      email: user.email,
      legal: command.legal,
      ip: command.ip,
      userAgent: command.userAgent,
    });

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
