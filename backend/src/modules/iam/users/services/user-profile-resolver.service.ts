import { Inject, Injectable } from '@nestjs/common';
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
import {
  type IRoleRepository,
  ROLE_REPOSITORY,
} from '@/modules/iam/roles/repositories/role.repository.interface';
import {
  AssignedRoleDto,
  UserProfileSummary,
} from '@/modules/iam/users/dto/user-response.dto';
import { User } from '@/modules/iam/users/entities/user.entity';
import {
  type IUserRoleRepository,
  USER_ROLE_REPOSITORY,
} from '@/modules/iam/users/repositories/user-role.repository.interface';

/**
 * Resuelve, en lote, el perfil asociado a cada cuenta (candidato o empresa)
 * para el listado administrativo. Trabaja por lotes para no incurrir en N+1.
 */
@Injectable()
export class UserProfileResolver {
  constructor(
    @Inject(CANDIDATE_PROFILE_REPOSITORY)
    private readonly candidates: ICandidateProfileRepository,
    @Inject(COMPANY_USER_REPOSITORY)
    private readonly companyUsers: ICompanyUserRepository,
    @Inject(COMPANY_REPOSITORY) private readonly companies: ICompanyRepository,
    @Inject(USER_ROLE_REPOSITORY)
    private readonly userRoles: IUserRoleRepository,
    @Inject(ROLE_REPOSITORY) private readonly roles: IRoleRepository,
  ) {}

  async resolve(users: User[]): Promise<Map<string, UserProfileSummary>> {
    const result = new Map<string, UserProfileSummary>();
    if (users.length === 0) return result;

    const candidateIds = users
      .filter((u) => u.role === Role.CANDIDATE)
      .map((u) => u.id);
    const employerIds = users
      .filter((u) => u.role === Role.EMPLOYER)
      .map((u) => u.id);

    const profiles = await this.candidates.findByUserIds(candidateIds);
    for (const profile of profiles) {
      result.set(profile.userId, {
        displayName: `${profile.firstName} ${profile.lastName}`.trim(),
      });
    }

    const memberships = await this.companyUsers.findByUserIds(employerIds);
    const companies = await this.companies.findByIds([
      ...new Set(memberships.map((m) => m.companyId)),
    ]);
    const byId = new Map(companies.map((c) => [c.id, c]));
    for (const membership of memberships) {
      const company = byId.get(membership.companyId);
      result.set(membership.userId, {
        displayName: company?.businessName ?? null,
        companyId: membership.companyId,
        companyName: company?.businessName ?? null,
        companyRole: membership.role,
      });
    }

    // Roles de plataforma asignados (base + adicionales) de todos los usuarios.
    const assignments = await this.userRoles.findByUserIds(
      users.map((u) => u.id),
    );
    const roles = await this.roles.findByIds([
      ...new Set(assignments.map((a) => a.roleId)),
    ]);
    const roleById = new Map(roles.map((r) => [r.id, r]));
    for (const user of users) {
      const assigned = assignments
        .filter((a) => a.userId === user.id)
        .map((a) => roleById.get(a.roleId))
        .filter((role): role is NonNullable<typeof role> => Boolean(role))
        .map<AssignedRoleDto>((role) => ({
          id: role.id,
          code: role.code,
          name: role.name,
          isSystem: role.isSystem,
        }));
      result.set(user.id, { ...result.get(user.id), roles: assigned });
    }

    return result;
  }

  async resolveOne(user: User): Promise<UserProfileSummary> {
    const map = await this.resolve([user]);
    return map.get(user.id) ?? {};
  }
}
