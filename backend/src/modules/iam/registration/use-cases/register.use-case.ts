import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { Role as PlatformRole } from '@/common/types/role.enum';
import { UserStatus } from '@/common/types/user-status.enum';
import { runInTransaction } from '@/common/utils/transaction.util';
import { AuditService } from '@/modules/audit/audit.service';
import { User } from '@/modules/iam/users/entities/user.entity';
import {
  type IUserRepository,
  USER_REPOSITORY,
} from '@/modules/iam/users/repositories/user.repository.interface';
import {
  type IUserRoleRepository,
  USER_ROLE_REPOSITORY,
} from '@/modules/iam/users/repositories/user-role.repository.interface';
import {
  type IRoleRepository,
  ROLE_REPOSITORY,
} from '@/modules/iam/roles/repositories/role.repository.interface';
import { Company } from '@/modules/companies/entities/company.entity';
import { CompanyUser } from '@/modules/companies/entities/company-user.entity';
import { CompanyMemberRole } from '@/modules/companies/enums/company-member-role.enum';
import {
  type ICompanyRepository,
  COMPANY_REPOSITORY,
} from '@/modules/companies/repositories/company.repository.interface';
import {
  type ICompanyUserRepository,
  COMPANY_USER_REPOSITORY,
} from '@/modules/companies/repositories/company-user.repository.interface';
import { CandidateProfile } from '@/modules/candidates/entities/candidate-profile.entity';
import { DocumentType } from '@/modules/candidates/enums/document-type.enum';
import {
  type ICandidateProfileRepository,
  CANDIDATE_PROFILE_REPOSITORY,
} from '@/modules/candidates/repositories/candidate-profile.repository.interface';
import { PasswordHasherService } from '@/modules/iam/auth/services/password-hasher.service';
import { RequestEmailVerificationUseCase } from '@/modules/iam/auth/use-cases/request-email-verification.use-case';
import { AccountType } from '@/modules/iam/registration/dto/register.dto';

export interface RegisterCompanyData {
  businessName: string;
  legalName: string;
  rfc: string;
  taxRegime: string;
  postalCode: string;
  economicSector?: string;
  website?: string;
  country?: string;
  state: string;
  municipality: string;
}

export interface RegisterCandidateData {
  firstName: string;
  lastName: string;
  documentType: DocumentType;
  documentNumber: string;
  curp?: string;
  birthDate: string;
  professionalTitle?: string;
  country?: string;
  state: string;
  municipality: string;
}

export interface RegisterCommand {
  accountType: AccountType;
  email: string;
  password: string;
  company?: RegisterCompanyData;
  candidate?: RegisterCandidateData;
  ip: string;
  userAgent: string;
}

export interface RegisterResult {
  userId: string;
  email: string;
  accountType: AccountType;
  verificationRequired: true;
}

/**
 * HU-005/006: registro único empresa/candidato. Toda la escritura ocurre en una
 * transacción (rollback ante cualquier fallo). Tras confirmar, dispara la
 * verificación de correo (M4). Localizado a México (RFC/CURP/estado/régimen).
 */
@Injectable()
export class RegisterUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(USER_ROLE_REPOSITORY)
    private readonly userRoles: IUserRoleRepository,
    @Inject(ROLE_REPOSITORY) private readonly roles: IRoleRepository,
    @Inject(COMPANY_REPOSITORY) private readonly companies: ICompanyRepository,
    @Inject(COMPANY_USER_REPOSITORY)
    private readonly companyUsers: ICompanyUserRepository,
    @Inject(CANDIDATE_PROFILE_REPOSITORY)
    private readonly candidates: ICandidateProfileRepository,
    private readonly hasher: PasswordHasherService,
    private readonly requestVerification: RequestEmailVerificationUseCase,
    private readonly audit: AuditService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async execute(command: RegisterCommand): Promise<RegisterResult> {
    const email = command.email.trim().toLowerCase();

    if (
      command.accountType !== 'company' &&
      command.accountType !== 'candidate'
    ) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.REGISTER_INVALID_ACCOUNT_TYPE,
        'El tipo de cuenta no es válido.',
      );
    }

    if (await this.users.findByEmail(email)) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.AUTH_EMAIL_ALREADY_EXISTS,
        'Ya existe una cuenta con este correo.',
      );
    }

    const roleCode =
      command.accountType === 'company' ? 'EMPLOYER' : 'CANDIDATE';
    const platformRole =
      command.accountType === 'company'
        ? PlatformRole.EMPLOYER
        : PlatformRole.CANDIDATE;
    const role = await this.roles.findByCode(roleCode);
    if (!role) {
      throw new AppException(
        HttpStatus.INTERNAL_SERVER_ERROR,
        ErrorCode.INTERNAL_ERROR,
        `El rol ${roleCode} no existe. Ejecuta el seed RBAC.`,
      );
    }

    // Validaciones/duplicados específicos por tipo (antes de la transacción).
    let companyRfc = '';
    if (command.accountType === 'company') {
      const data = command.company;
      if (!data) throw this.missingProfile('empresa');
      companyRfc = data.rfc.trim().toUpperCase();
      if (await this.companies.existsByRfc(companyRfc)) {
        throw new AppException(
          HttpStatus.CONFLICT,
          ErrorCode.COMPANY_RFC_ALREADY_EXISTS,
          'Ya existe una empresa registrada con este RFC.',
        );
      }
    } else {
      const data = command.candidate;
      if (!data) throw this.missingProfile('candidato');
      if (
        await this.candidates.existsByDocumentNumber(data.documentNumber.trim())
      ) {
        throw new AppException(
          HttpStatus.CONFLICT,
          ErrorCode.CANDIDATE_DOCUMENT_ALREADY_EXISTS,
          'Ya existe un candidato registrado con este documento.',
        );
      }
      const birth = new Date(data.birthDate);
      if (Number.isNaN(birth.getTime()) || birth.getTime() > Date.now()) {
        throw new AppException(
          HttpStatus.BAD_REQUEST,
          ErrorCode.INVALID_BIRTH_DATE,
          'La fecha de nacimiento no es válida o es futura.',
        );
      }
    }

    const passwordHash = await this.hasher.hash(command.password);

    const user = new User();
    user.email = email;
    user.passwordHash = passwordHash;
    user.role = platformRole;
    user.status = UserStatus.ACTIVE;
    user.emailVerifiedAt = null;

    let userId = '';
    await runInTransaction(this.dataSource, async (manager) => {
      const saved = await this.users.save(user, manager);
      userId = saved.id;
      await this.userRoles.add(saved.id, role.id, manager);

      if (command.accountType === 'company') {
        const data = command.company!;
        const company = new Company();
        company.businessName = data.businessName.trim();
        company.legalName = data.legalName.trim();
        company.rfc = companyRfc;
        company.taxRegime = data.taxRegime;
        company.postalCode = data.postalCode;
        company.economicSector = data.economicSector?.trim() || null;
        company.website = data.website?.trim() || null;
        company.country = data.country?.trim() || 'MX';
        company.state = data.state;
        company.municipality = data.municipality.trim();
        const savedCompany = await this.companies.save(company, manager);

        const member = new CompanyUser();
        member.companyId = savedCompany.id;
        member.userId = saved.id;
        member.role = CompanyMemberRole.OWNER;
        await this.companyUsers.save(member, manager);
      } else {
        const data = command.candidate!;
        const profile = new CandidateProfile();
        profile.userId = saved.id;
        profile.firstName = data.firstName.trim();
        profile.lastName = data.lastName.trim();
        profile.documentType = data.documentType;
        profile.documentNumber = data.documentNumber.trim();
        profile.curp = data.curp?.trim().toUpperCase() || null;
        profile.birthDate = data.birthDate;
        profile.professionalTitle = data.professionalTitle?.trim() || null;
        profile.country = data.country?.trim() || 'MX';
        profile.state = data.state;
        profile.municipality = data.municipality.trim();
        await this.candidates.save(profile, manager);
      }

      await this.audit.record(
        {
          action: 'auth.register',
          actorUserId: saved.id,
          entity: 'user',
          entityId: saved.id,
          ip: command.ip,
          userAgent: command.userAgent,
          metadata: { accountType: command.accountType, role: roleCode },
        },
        manager,
      );
    });

    // Verificación de correo (M4) fuera de la transacción: la cuenta ya existe.
    await this.requestVerification.execute({
      email,
      ip: command.ip,
      userAgent: command.userAgent,
    });

    return {
      userId,
      email,
      accountType: command.accountType,
      verificationRequired: true,
    };
  }

  private missingProfile(kind: string): AppException {
    return new AppException(
      HttpStatus.BAD_REQUEST,
      ErrorCode.VALIDATION_ERROR,
      `Faltan los datos del ${kind}.`,
    );
  }
}
