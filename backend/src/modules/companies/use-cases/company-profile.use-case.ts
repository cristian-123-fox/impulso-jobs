import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { Role } from '@/common/types/role.enum';
import { normalizeMxPhone, normalizeRfc } from '@/common/utils/mx-identifiers';
import { AuditService } from '@/modules/audit/audit.service';
import { Company } from '@/modules/companies/entities/company.entity';
import { CompanyUser } from '@/modules/companies/entities/company-user.entity';
import { CompanyType } from '@/modules/companies/enums/company-type.enum';
import {
  type ICompanyRepository,
  COMPANY_REPOSITORY,
} from '@/modules/companies/repositories/company.repository.interface';
import {
  type ICompanyUserRepository,
  COMPANY_USER_REPOSITORY,
} from '@/modules/companies/repositories/company-user.repository.interface';

export interface CompanyActor {
  userId: string;
  role: Role;
  ip: string;
  userAgent: string;
}

export interface UpdateCompanyProfileCommand extends CompanyActor {
  rfc?: string;
  businessName: string;
  legalName: string;
  taxRegime: string;
  cfdiUse?: string;
  postalCode: string;
  economicSector?: string;
  companyType?: CompanyType;
  corporateEmail?: string;
  phoneNumber?: string;
  website?: string;
  country?: string;
  state: string;
  municipality: string;
  address?: string;
  companyDescription?: string;
  employeeCount?: number;
  foundationYear?: number;
}

export interface UpdateCompanyLogoCommand extends CompanyActor {
  logoUrl?: string | null;
}

export interface CompanyProfileResult {
  company: Company;
  companyRole: string;
}

@Injectable()
export class CompanyProfileUseCase {
  constructor(
    @Inject(COMPANY_REPOSITORY)
    private readonly companies: ICompanyRepository,
    @Inject(COMPANY_USER_REPOSITORY)
    private readonly members: ICompanyUserRepository,
    private readonly audit: AuditService,
  ) {}

  async getProfile(userId: string, role: Role): Promise<CompanyProfileResult> {
    this.assertEmployerRole(role);
    const { company, membership } = await this.requireOwnCompany(userId);
    return { company, companyRole: membership.role };
  }

  async updateProfile(
    command: UpdateCompanyProfileCommand,
  ): Promise<CompanyProfileResult> {
    this.assertEmployerRole(command.role);
    const { company, membership } = await this.requireOwnCompany(
      command.userId,
    );

    this.assertRfcUnchanged(command.rfc, company.rfc);

    const phoneNumber = this.resolvePhone(command.phoneNumber);
    const foundationYear = this.resolveFoundationYear(command.foundationYear);

    company.businessName = command.businessName.trim();
    company.legalName = command.legalName.trim();
    company.taxRegime = command.taxRegime;
    company.cfdiUse = command.cfdiUse ?? null;
    company.postalCode = command.postalCode.trim();
    company.economicSector = command.economicSector?.trim() || null;
    company.companyType = command.companyType ?? null;
    company.corporateEmail =
      command.corporateEmail?.trim().toLowerCase() || null;
    company.phoneNumber = phoneNumber;
    company.website = command.website?.trim() || null;
    company.country = command.country?.trim() || 'MX';
    company.state = command.state;
    company.municipality = command.municipality.trim();
    company.address = command.address?.trim() || null;
    company.companyDescription = command.companyDescription?.trim() || null;
    company.employeeCount = command.employeeCount ?? null;
    company.foundationYear = foundationYear;

    const saved = await this.companies.save(company);
    await this.audit.record({
      action: 'company.profile.update',
      actorUserId: command.userId,
      entity: 'company',
      entityId: saved.id,
      ip: command.ip,
      userAgent: command.userAgent,
    });

    return { company: saved, companyRole: membership.role };
  }

  async updateLogo(command: UpdateCompanyLogoCommand): Promise<Company> {
    this.assertEmployerRole(command.role);
    const { company } = await this.requireOwnCompany(command.userId);

    company.logoUrl = command.logoUrl?.trim() || null;
    const saved = await this.companies.save(company);
    await this.audit.record({
      action: 'company.profile.logo.update',
      actorUserId: command.userId,
      entity: 'company',
      entityId: saved.id,
      ip: command.ip,
      userAgent: command.userAgent,
    });

    return saved;
  }

  /** Resuelve la empresa del usuario vía `company_users` (ownership). */
  private async requireOwnCompany(
    userId: string,
  ): Promise<{ company: Company; membership: CompanyUser }> {
    const membership = await this.members.findByUserId(userId);
    if (!membership) {
      throw this.companyNotFound();
    }
    const company = await this.companies.findById(membership.companyId);
    if (!company) {
      throw this.companyNotFound();
    }
    return { company, membership };
  }

  private assertRfcUnchanged(input: string | undefined, current: string): void {
    if (input === undefined) return;
    if (normalizeRfc(input) !== current) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.COMPANY_RFC_IMMUTABLE,
        'El RFC no puede modificarse tras el registro.',
      );
    }
  }

  private resolvePhone(phone: string | undefined): string | null {
    const value = phone?.trim();
    if (!value) return null;
    const normalized = normalizeMxPhone(value);
    if (!normalized) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.COMPANY_INVALID_PHONE,
        'El teléfono debe tener 10 dígitos (con lada +52 opcional).',
      );
    }
    return normalized;
  }

  private resolveFoundationYear(year: number | undefined): number | null {
    if (year === undefined || year === null) return null;
    const currentYear = new Date().getFullYear();
    if (year > currentYear) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.COMPANY_INVALID_FOUNDATION_YEAR,
        'El año de fundación no puede ser mayor al año actual.',
      );
    }
    return year;
  }

  private assertEmployerRole(role: Role): void {
    if (role !== Role.EMPLOYER) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        ErrorCode.FORBIDDEN,
        'Solo las empresas pueden gestionar este perfil.',
      );
    }
  }

  private companyNotFound(): AppException {
    return new AppException(
      HttpStatus.NOT_FOUND,
      ErrorCode.COMPANY_NOT_FOUND,
      'No existe una empresa asociada a este usuario.',
    );
  }
}
