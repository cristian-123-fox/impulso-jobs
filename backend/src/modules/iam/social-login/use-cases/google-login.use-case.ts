import { randomUUID } from 'node:crypto';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { COUNTRY_CODES } from '@/common/catalogs/countries';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { Role } from '@/common/types/role.enum';
import { UserStatus } from '@/common/types/user-status.enum';
import { runInTransaction } from '@/common/utils/transaction.util';
import { AuditService } from '@/modules/audit/audit.service';
import { CandidateProfile } from '@/modules/candidates/entities/candidate-profile.entity';
import {
  type ICandidateProfileRepository,
  CANDIDATE_PROFILE_REPOSITORY,
} from '@/modules/candidates/repositories/candidate-profile.repository.interface';
import { PasswordHasherService } from '@/modules/iam/auth/services/password-hasher.service';
import {
  SessionResult,
  SessionService,
} from '@/modules/iam/auth/services/session.service';
import {
  type IRoleRepository,
  ROLE_REPOSITORY,
} from '@/modules/iam/roles/repositories/role.repository.interface';
import {
  GoogleIdentity,
  GoogleTokenVerifier,
} from '@/modules/iam/social-login/services/google-token-verifier.service';
import { User } from '@/modules/iam/users/entities/user.entity';
import {
  type IUserRepository,
  USER_REPOSITORY,
} from '@/modules/iam/users/repositories/user.repository.interface';
import {
  type IUserRoleRepository,
  USER_ROLE_REPOSITORY,
} from '@/modules/iam/users/repositories/user-role.repository.interface';

export interface GoogleLoginCommand {
  credential: string;
  ip: string;
  userAgent: string;
}

/**
 * Login con Google. Si el correo no existe, la cuenta **nace aquí como
 * candidato** (decisión de producto: entrar con Google no debe pedir un
 * registro aparte).
 *
 * Tres ideas que sostienen el diseño:
 *
 * - **El correo viene verificado por Google**, así que la cuenta se da por
 *   verificada: no hay mandar un magic link a una dirección que otra persona
 *   acaba de demostrar que controla.
 * - **`password_hash` recibe un hash de una clave aleatoria de un solo uso**.
 *   Nadie la conoce, así que el login por contraseña falla siempre y el resto
 *   del código sigue viendo un `string` (sin ramas por `null`); además, quien
 *   entre por Google puede fijar una contraseña después desde "olvidé mi
 *   contraseña".
 * - **El perfil del aspirante nace incompleto a propósito**: Google no sabe el
 *   documento ni la fecha de nacimiento, y estos campos ahora admiten `null`.
 *   Se completan desde el propio perfil (y el back-office puede rellenar el
 *   documento). Lo que sí trae —nombre, foto, país inferido del idioma— se
 *   aprovecha.
 */
@Injectable()
export class GoogleLoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(USER_ROLE_REPOSITORY)
    private readonly userRoles: IUserRoleRepository,
    @Inject(ROLE_REPOSITORY) private readonly roles: IRoleRepository,
    @Inject(CANDIDATE_PROFILE_REPOSITORY)
    private readonly candidates: ICandidateProfileRepository,
    private readonly verifier: GoogleTokenVerifier,
    private readonly hasher: PasswordHasherService,
    private readonly session: SessionService,
    private readonly audit: AuditService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async execute(command: GoogleLoginCommand): Promise<SessionResult> {
    const identity = await this.verifier.verify(command.credential);
    const client = { ip: command.ip, userAgent: command.userAgent };
    const email = identity.email.trim().toLowerCase();

    const user = await this.resolveAccount(identity, email, client);
    return this.session.issue(user, client);
  }

  private async resolveAccount(
    identity: GoogleIdentity,
    email: string,
    client: { ip: string; userAgent: string },
  ): Promise<User> {
    // Primero por `sub`: si la persona renombró su correo de Google, sigue
    // siendo la misma cuenta.
    const existing =
      (await this.users.findByGoogleId(identity.sub)) ??
      (await this.users.findByEmail(email));

    if (!existing) {
      return this.createCandidate(identity, email, client);
    }

    await this.assertUsable(existing, client);
    await this.linkIdentity(existing, identity, email);
    await this.ensureCandidateProfile(existing, identity);
    return existing;
  }

  /** Mismas compuertas que el login por contraseña: bloqueada o inactiva. */
  private async assertUsable(
    user: User,
    client: { ip: string; userAgent: string },
  ): Promise<void> {
    if (user.blockedUntil && user.blockedUntil.getTime() > Date.now()) {
      await this.audit.record({
        action: 'auth.login.blocked',
        actorUserId: user.id,
        entity: 'user',
        entityId: user.id,
        ip: client.ip,
        userAgent: client.userAgent,
      });
      throw new AppException(
        HttpStatus.LOCKED,
        ErrorCode.AUTH_ACCOUNT_BLOCKED,
        'Cuenta bloqueada temporalmente. Intenta de nuevo en unos minutos.',
      );
    }

    if (user.status !== UserStatus.ACTIVE) {
      await this.audit.record({
        action: 'auth.login.inactive',
        actorUserId: user.id,
        entity: 'user',
        entityId: user.id,
        ip: client.ip,
        userAgent: client.userAgent,
        metadata: { status: user.status },
      });
      throw new AppException(
        HttpStatus.FORBIDDEN,
        ErrorCode.AUTH_ACCOUNT_INACTIVE,
        'Tu cuenta no está activa. Contacta a soporte.',
      );
    }
  }

  /**
   * Vincula la identidad de Google a la cuenta existente y, si el correo de
   * Google cambió, lo adopta — salvo que esa dirección ya esté tomada por otra
   * cuenta, en cuyo caso se conserva la actual.
   */
  private async linkIdentity(
    user: User,
    identity: GoogleIdentity,
    email: string,
  ): Promise<void> {
    user.googleId = identity.sub;
    // Google verificó el correo en el momento de emitir el token.
    user.emailVerifiedAt ??= new Date();

    if (user.email !== email) {
      // El correo de Google cambió: se adopta salvo que otra cuenta lo tenga.
      const owner = await this.users.findByEmail(email);
      if (!owner) user.email = email;
    }
    if (!user.firstName && identity.givenName) {
      user.firstName = identity.givenName.trim().slice(0, 80) || null;
    }
    if (!user.lastName && identity.familyName) {
      user.lastName = identity.familyName.trim().slice(0, 80) || null;
    }
    if (!user.photoUrl && identity.picture) {
      user.photoUrl = identity.picture.slice(0, 500);
    }
  }

  private async ensureCandidateProfile(
    user: User,
    identity: GoogleIdentity,
  ): Promise<void> {
    if (user.role !== Role.CANDIDATE) return;
    const profile = await this.candidates.findByUserId(user.id);
    if (profile) return;
    await this.candidates.save(
      this.buildProfile(identity, user.id, user.email),
    );
  }

  private async createCandidate(
    identity: GoogleIdentity,
    email: string,
    client: { ip: string; userAgent: string },
  ): Promise<User> {
    const role = await this.roles.findByCode('CANDIDATE');
    if (!role) {
      throw new AppException(
        HttpStatus.INTERNAL_SERVER_ERROR,
        ErrorCode.INTERNAL_ERROR,
        'El rol CANDIDATE no existe. Ejecuta el seed RBAC.',
      );
    }

    const user = new User();
    user.email = email;
    user.googleId = identity.sub;
    user.passwordHash = await this.hasher.hash(randomUUID());
    user.role = Role.CANDIDATE;
    user.status = UserStatus.ACTIVE;
    user.emailVerifiedAt = new Date();
    user.firstName = this.firstNameOf(identity, email);
    user.lastName = this.lastNameOf(identity);
    user.photoUrl = identity.picture?.slice(0, 500) ?? null;

    let created = user;
    await runInTransaction(this.dataSource, async (manager) => {
      created = await this.users.save(user, manager);
      await this.userRoles.add(created.id, role.id, manager);
      await this.candidates.save(
        this.buildProfile(identity, created.id, email),
        manager,
      );
      await this.audit.record(
        {
          action: 'auth.register',
          actorUserId: created.id,
          entity: 'user',
          entityId: created.id,
          ip: client.ip,
          userAgent: client.userAgent,
          metadata: {
            accountType: 'candidate',
            role: 'CANDIDATE',
            provider: 'google',
          },
        },
        manager,
      );
    });

    return created;
  }

  /**
   * Perfil mínimo viable: nombre y país llegan de Google, el resto queda en
   * `null`/vacío para que la persona lo complete en `/candidato/perfil`.
   */
  private buildProfile(
    identity: GoogleIdentity,
    userId: string,
    email: string,
  ): CandidateProfile {
    const country = this.countryOf(identity.locale);
    const profile = new CandidateProfile();
    profile.userId = userId;
    profile.firstName = this.firstNameOf(identity, email);
    profile.lastName = this.lastNameOf(identity);
    profile.documentCountry = country;
    profile.documentType = null;
    profile.documentNumber = null;
    profile.birthDate = null;
    profile.country = country;
    profile.state = '';
    profile.municipality = '';
    profile.profilePhotoUrl = identity.picture?.slice(0, 500) ?? null;
    return profile;
  }

  private firstNameOf(identity: GoogleIdentity, email: string): string {
    const given = identity.givenName?.trim();
    if (given) return given.slice(0, 80);
    const first = identity.name?.trim().split(/\s+/)[0];
    return (first || email.split('@')[0] || 'Candidato').slice(0, 80);
  }

  private lastNameOf(identity: GoogleIdentity): string {
    const family = identity.familyName?.trim();
    if (family) return family.slice(0, 80);
    const parts = identity.name?.trim().split(/\s+/) ?? [];
    return parts.slice(1).join(' ').slice(0, 80);
  }

  /**
   * El `locale` de Google es el idioma de la interfaz, no la residencia: sólo
   * se usa como pista inicial y sólo si el código está entre los países
   * soportados. Si no, México, que es el mercado de la plataforma.
   */
  private countryOf(locale?: string): string {
    const region = (locale ?? '').split(/[-_]/)[1]?.toUpperCase().trim();
    const supported = COUNTRY_CODES as readonly string[];
    if (region && supported.includes(region)) {
      return region;
    }
    return 'MX';
  }
}
