import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  PaginatedResponse,
  toPaginated,
} from '@/common/dto/paginated-response.dto';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { Role as PlatformRole } from '@/common/types/role.enum';
import { UserStatus } from '@/common/types/user-status.enum';
import { runInTransaction } from '@/common/utils/transaction.util';
import { AuditService } from '@/modules/audit/audit.service';
import {
  AdminCompanyResponseDto,
  toAdminCompanyResponse,
} from '@/modules/companies/dto/admin-company.dto';
import { Company } from '@/modules/companies/entities/company.entity';
import { CompanyUser } from '@/modules/companies/entities/company-user.entity';
import { CompanyMemberRole } from '@/modules/companies/enums/company-member-role.enum';
import { CompanyType } from '@/modules/companies/enums/company-type.enum';
import {
  type ICompanyRepository,
  COMPANY_REPOSITORY,
  CompanySearchCriteria,
} from '@/modules/companies/repositories/company.repository.interface';
import {
  type ICompanyUserRepository,
  COMPANY_USER_REPOSITORY,
} from '@/modules/companies/repositories/company-user.repository.interface';
import { PasswordHasherService } from '@/modules/iam/auth/services/password-hasher.service';
import {
  type IRoleRepository,
  ROLE_REPOSITORY,
} from '@/modules/iam/roles/repositories/role.repository.interface';
import { User } from '@/modules/iam/users/entities/user.entity';
import {
  type IUserRepository,
  USER_REPOSITORY,
} from '@/modules/iam/users/repositories/user.repository.interface';
import {
  type IUserRoleRepository,
  USER_ROLE_REPOSITORY,
} from '@/modules/iam/users/repositories/user-role.repository.interface';

export interface CreateCompanyCommand {
  businessName: string;
  legalName: string;
  rfc: string;
  taxRegime: string;
  postalCode: string;
  state: string;
  municipality: string;
  economicSector?: string;
  companyType?: CompanyType;
  corporateEmail?: string;
  phoneNumber?: string;
  website?: string;
  owner?: { email: string; password: string };
  actorUserId: string;
  ip: string;
  userAgent: string;
}

/** El RFC no viaja: identifica fiscalmente a la empresa y es inmutable. */
export interface UpdateCompanyCommand {
  id: string;
  businessName: string;
  legalName: string;
  taxRegime: string;
  postalCode: string;
  state: string;
  municipality: string;
  economicSector?: string;
  companyType?: CompanyType;
  corporateEmail?: string;
  phoneNumber?: string;
  website?: string;
  actorUserId: string;
  ip: string;
  userAgent: string;
}

export interface CreateCompanyResult {
  company: AdminCompanyResponseDto;
  /** Id del usuario dueño, si se creó junto con la empresa. */
  ownerUserId: string | null;
}

/**
 * Back-office de empresas: listado supervisado y alta manual. El alta puede
 * crear a la vez la cuenta OWNER (verificada y activa), que es lo que permite
 * usar la empresa de inmediato sin pasar por el registro público.
 */
@Injectable()
export class AdminCompaniesUseCase {
  constructor(
    @Inject(COMPANY_REPOSITORY) private readonly companies: ICompanyRepository,
    @Inject(COMPANY_USER_REPOSITORY)
    private readonly companyUsers: ICompanyUserRepository,
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(USER_ROLE_REPOSITORY)
    private readonly userRoles: IUserRoleRepository,
    @Inject(ROLE_REPOSITORY) private readonly roles: IRoleRepository,
    private readonly hasher: PasswordHasherService,
    private readonly audit: AuditService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async list(
    criteria: CompanySearchCriteria,
  ): Promise<PaginatedResponse<AdminCompanyResponseDto>> {
    const [rows, total] = await this.companies.findAndCount(criteria);
    const items = await this.decorate(rows);
    return toPaginated(items, total, criteria.page, criteria.limit);
  }

  async get(id: string): Promise<AdminCompanyResponseDto> {
    const company = await this.companies.findById(id);
    if (!company) throw this.notFound();
    const [item] = await this.decorate([company]);
    return item;
  }

  async create(command: CreateCompanyCommand): Promise<CreateCompanyResult> {
    const rfc = command.rfc.trim().toUpperCase();
    if (await this.companies.existsByRfc(rfc)) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.COMPANY_RFC_ALREADY_EXISTS,
        'Ya existe una empresa registrada con este RFC.',
      );
    }

    const ownerEmail = command.owner?.email.trim().toLowerCase();
    let employerRoleId: string | null = null;
    if (ownerEmail) {
      if (await this.users.findByEmail(ownerEmail)) {
        throw new AppException(
          HttpStatus.CONFLICT,
          ErrorCode.AUTH_EMAIL_ALREADY_EXISTS,
          'Ya existe una cuenta con este correo.',
        );
      }
      const role = await this.roles.findByCode(PlatformRole.EMPLOYER);
      if (!role) {
        throw new AppException(
          HttpStatus.INTERNAL_SERVER_ERROR,
          ErrorCode.INTERNAL_ERROR,
          'El rol EMPLOYER no existe. Ejecuta el seed RBAC.',
        );
      }
      employerRoleId = role.id;
    }

    const passwordHash = command.owner
      ? await this.hasher.hash(command.owner.password)
      : null;

    const company = new Company();
    company.businessName = command.businessName.trim();
    company.legalName = command.legalName.trim();
    company.rfc = rfc;
    company.taxRegime = command.taxRegime;
    company.postalCode = command.postalCode.trim();
    company.state = command.state;
    company.municipality = command.municipality.trim();
    company.economicSector = command.economicSector?.trim() || null;
    company.companyType = command.companyType ?? null;
    company.corporateEmail =
      command.corporateEmail?.trim().toLowerCase() || null;
    company.phoneNumber = command.phoneNumber?.trim() || null;
    company.website = command.website?.trim() || null;
    company.country = 'MX';

    let saved!: Company;
    let ownerUserId: string | null = null;

    await runInTransaction(this.dataSource, async (manager) => {
      saved = await this.companies.save(company, manager);

      if (ownerEmail && passwordHash && employerRoleId) {
        const owner = new User();
        owner.email = ownerEmail;
        owner.passwordHash = passwordHash;
        owner.role = PlatformRole.EMPLOYER;
        owner.status = UserStatus.ACTIVE;
        owner.emailVerifiedAt = new Date();
        const savedOwner = await this.users.save(owner, manager);
        ownerUserId = savedOwner.id;

        await this.userRoles.add(savedOwner.id, employerRoleId, manager);

        const member = new CompanyUser();
        member.companyId = saved.id;
        member.userId = savedOwner.id;
        member.role = CompanyMemberRole.OWNER;
        await this.companyUsers.save(member, manager);
      }

      await this.audit.record(
        {
          action: 'companies.create',
          actorUserId: command.actorUserId,
          entity: 'company',
          entityId: saved.id,
          ip: command.ip,
          userAgent: command.userAgent,
          metadata: { rfc, ownerUserId },
        },
        manager,
      );
    });

    return {
      company: toAdminCompanyResponse(saved, {
        ownerEmail: ownerEmail ?? null,
        memberCount: ownerUserId ? 1 : 0,
      }),
      ownerUserId,
    };
  }

  /**
   * Edición desde el back-office. Toca los mismos campos que el autoservicio
   * de la empresa (`PUT /company/profile`) menos el RFC, que no se reemite.
   */
  async update(
    command: UpdateCompanyCommand,
  ): Promise<AdminCompanyResponseDto> {
    const company = await this.companies.findById(command.id);
    if (!company) throw this.notFound();

    company.businessName = command.businessName.trim();
    company.legalName = command.legalName.trim();
    company.taxRegime = command.taxRegime;
    company.postalCode = command.postalCode.trim();
    company.state = command.state;
    company.municipality = command.municipality.trim();
    company.economicSector = command.economicSector?.trim() || null;
    company.companyType = command.companyType ?? null;
    company.corporateEmail =
      command.corporateEmail?.trim().toLowerCase() || null;
    company.phoneNumber = command.phoneNumber?.trim() || null;
    company.website = command.website?.trim() || null;

    const saved = await this.companies.save(company);

    await this.audit.record({
      action: 'companies.update',
      actorUserId: command.actorUserId,
      entity: 'company',
      entityId: saved.id,
      ip: command.ip,
      userAgent: command.userAgent,
    });

    // Se vuelve a decorar para no perder dueño ni número de miembros.
    const [item] = await this.decorate([saved]);
    return item;
  }

  /** Añade dueño y número de miembros a cada empresa, en lote (sin N+1). */
  private async decorate(
    companies: Company[],
  ): Promise<AdminCompanyResponseDto[]> {
    if (companies.length === 0) return [];

    const memberships = await this.companyUsers.findByCompanyIds(
      companies.map((c) => c.id),
    );
    const owners = memberships.filter(
      (m) => m.role === CompanyMemberRole.OWNER,
    );
    const ownerUsers = await this.users.findByIds(owners.map((o) => o.userId));
    const emailByUserId = new Map(ownerUsers.map((u) => [u.id, u.email]));

    const ownerByCompany = new Map<string, string | null>();
    const countByCompany = new Map<string, number>();
    for (const membership of memberships) {
      countByCompany.set(
        membership.companyId,
        (countByCompany.get(membership.companyId) ?? 0) + 1,
      );
      if (membership.role === CompanyMemberRole.OWNER) {
        ownerByCompany.set(
          membership.companyId,
          emailByUserId.get(membership.userId) ?? null,
        );
      }
    }

    return companies.map((company) =>
      toAdminCompanyResponse(company, {
        ownerEmail: ownerByCompany.get(company.id) ?? null,
        memberCount: countByCompany.get(company.id) ?? 0,
      }),
    );
  }

  private notFound(): AppException {
    return new AppException(
      HttpStatus.NOT_FOUND,
      ErrorCode.COMPANY_NOT_FOUND,
      'La empresa no existe.',
    );
  }
}
