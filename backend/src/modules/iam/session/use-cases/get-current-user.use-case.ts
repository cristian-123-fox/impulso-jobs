import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { Role } from '@/common/types/role.enum';
import { User } from '@/modules/iam/users/entities/user.entity';
import {
  type ICandidateProfileRepository,
  CANDIDATE_PROFILE_REPOSITORY,
} from '@/modules/candidates/repositories/candidate-profile.repository.interface';
import {
  type ICompanyRepository,
  COMPANY_REPOSITORY,
} from '@/modules/companies/repositories/company.repository.interface';
import {
  type ICompanyUserRepository,
  COMPANY_USER_REPOSITORY,
} from '@/modules/companies/repositories/company-user.repository.interface';
import { PermissionsService } from '@/modules/iam/permissions/services/permissions.service';
import { CurrentUserDto } from '@/modules/iam/session/dto/current-user.dto';
import {
  type IUserRoleRepository,
  USER_ROLE_REPOSITORY,
} from '@/modules/iam/users/repositories/user-role.repository.interface';
import {
  type IUserRepository,
  USER_REPOSITORY,
} from '@/modules/iam/users/repositories/user.repository.interface';

/**
 * T27: identidad completa de la sesión activa.
 *
 * Se lee del repositorio y no del JWT a propósito: el token se emitió al
 * iniciar sesión y no refleja un cambio de foto o de nombre posterior.
 *
 * **Precedencia del nombre.** Manda el perfil del dominio —
 * `candidate_profiles` para un candidato, `companies.business_name` para una
 * empresa — y `users` es el respaldo. Es la misma regla que fija
 * `toUserResponse` en el back-office, y el motivo es que esos perfiles son el
 * origen único de ese dato para su rol.
 *
 * **La foto va al contrario**: manda `users.photo_url`. Un nombre comercial
 * responde a "en representación de quién actúo"; un avatar responde a "quién
 * soy", y si alguien se ha molestado en subir su foto en «Mi cuenta» espera
 * verla. El dominio queda de respaldo, así que quien no suba nada conserva
 * exactamente lo que veía.
 *
 * El respaldo **no existía** hasta ahora: cuando se añadieron `first_name`,
 * `last_name` y `photo_url` a `users`, este caso de uso siguió devolviendo
 * vacío para un ADMIN, así que el back-office podía ponerle nombre a una
 * cuenta administrativa y su propia cabecera seguía enseñando el correo.
 */
@Injectable()
export class GetCurrentUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(CANDIDATE_PROFILE_REPOSITORY)
    private readonly candidates: ICandidateProfileRepository,
    @Inject(COMPANY_USER_REPOSITORY)
    private readonly companyUsers: ICompanyUserRepository,
    @Inject(COMPANY_REPOSITORY) private readonly companies: ICompanyRepository,
    @Inject(USER_ROLE_REPOSITORY)
    private readonly userRoles: IUserRoleRepository,
    private readonly permissions: PermissionsService,
  ) {}

  async execute(userId: string): Promise<CurrentUserDto> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new AppException(
        HttpStatus.UNAUTHORIZED,
        ErrorCode.UNAUTHORIZED,
        'No autorizado.',
      );
    }

    const [identity, permissions] = await Promise.all([
      this.resolveIdentity(user),
      this.resolvePermissions(user.id),
    ]);
    const fallback = ownIdentity(user);

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      // El correo es el último recurso: un perfil a medio completar no puede
      // dejar el navbar sin nada que pintar.
      displayName: identity.displayName || fallback.displayName || user.email,
      // La foto va al revés que el nombre: manda la que el titular subió en
      // «Mi cuenta». Es la única que ha elegido *como persona*, y la cabecera
      // de sesión muestra a quien está usando la aplicación. Quien no suba
      // ninguna sigue viendo la de su dominio (logo de la empresa, foto del
      // perfil de aspirante), así que nadie pierde lo que ya veía.
      avatarUrl: fallback.avatarUrl ?? identity.avatarUrl,
      permissions,
    };
  }

  /** Mismos roles que resuelve `JwtStrategy`: los de `user_roles`. */
  private async resolvePermissions(userId: string): Promise<string[]> {
    const roleIds = await this.userRoles.findRoleIdsByUserId(userId);
    return [...(await this.permissions.permissionsForRoles(roleIds))].sort();
  }

  private async resolveIdentity(
    user: User,
  ): Promise<{ displayName: string; avatarUrl: string | null }> {
    if (user.role === Role.CANDIDATE) {
      const profile = await this.candidates.findByUserId(user.id);
      return {
        displayName:
          `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim(),
        avatarUrl: profile?.profilePhotoUrl ?? null,
      };
    }

    if (user.role === Role.EMPLOYER) {
      const membership = await this.companyUsers.findByUserId(user.id);
      const company = membership
        ? await this.companies.findById(membership.companyId)
        : null;
      return {
        displayName: company?.businessName ?? '',
        avatarUrl: company?.logoUrl ?? null,
      };
    }

    // ADMIN no tiene perfil de dominio: su identidad es la de `users`.
    return { displayName: '', avatarUrl: null };
  }
}

/** Identidad guardada en `users`: la única de un ADMIN, respaldo del resto. */
function ownIdentity(user: User): {
  displayName: string;
  avatarUrl: string | null;
} {
  return {
    displayName: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
    avatarUrl: user.photoUrl ?? null,
  };
}
