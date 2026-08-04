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
import { UserProfileSummary } from '@/modules/iam/users/dto/user-response.dto';
import { User } from '@/modules/iam/users/entities/user.entity';

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

    return result;
  }

  async resolveOne(user: User): Promise<UserProfileSummary> {
    const map = await this.resolve([user]);
    return map.get(user.id) ?? {};
  }
}
