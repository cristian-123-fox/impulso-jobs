import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { Role } from '@/common/types/role.enum';
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
import { CurrentUserDto } from '@/modules/iam/session/dto/current-user.dto';
import {
  type IUserRepository,
  USER_REPOSITORY,
} from '@/modules/iam/users/repositories/user.repository.interface';

/**
 * T27: identidad completa de la sesión activa.
 *
 * El nombre y la imagen viven en el perfil del dominio correspondiente, no en
 * `users`, así que se resuelven por rol. Se lee del repositorio y no del JWT a
 * propósito: el token se emitió al iniciar sesión y no refleja un cambio de
 * foto o de nombre comercial posterior.
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

    const identity = await this.resolveIdentity(user.id, user.role);

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      // El correo es el último recurso: un perfil a medio completar no puede
      // dejar el navbar sin nada que pintar.
      displayName: identity.displayName || user.email,
      avatarUrl: identity.avatarUrl,
    };
  }

  private async resolveIdentity(
    userId: string,
    role: Role,
  ): Promise<{ displayName: string; avatarUrl: string | null }> {
    if (role === Role.CANDIDATE) {
      const profile = await this.candidates.findByUserId(userId);
      return {
        displayName:
          `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim(),
        avatarUrl: profile?.profilePhotoUrl ?? null,
      };
    }

    if (role === Role.EMPLOYER) {
      const membership = await this.companyUsers.findByUserId(userId);
      const company = membership
        ? await this.companies.findById(membership.companyId)
        : null;
      return {
        displayName: company?.businessName ?? '',
        avatarUrl: company?.logoUrl ?? null,
      };
    }

    // ADMIN: `users` no tiene columna de nombre, así que se muestra el correo.
    return { displayName: '', avatarUrl: null };
  }
}
