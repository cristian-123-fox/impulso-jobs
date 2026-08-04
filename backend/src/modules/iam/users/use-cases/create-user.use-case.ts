import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
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
import { PasswordHasherService } from '@/modules/iam/auth/services/password-hasher.service';
import { RegisterCandidateData } from '@/modules/iam/registration/use-cases/register.use-case';
import {
  type IRoleRepository,
  ROLE_REPOSITORY,
} from '@/modules/iam/roles/repositories/role.repository.interface';
import {
  UserResponseDto,
  toUserResponse,
} from '@/modules/iam/users/dto/user-response.dto';
import { User } from '@/modules/iam/users/entities/user.entity';
import {
  type IUserRepository,
  USER_REPOSITORY,
} from '@/modules/iam/users/repositories/user.repository.interface';
import {
  type IUserRoleRepository,
  USER_ROLE_REPOSITORY,
} from '@/modules/iam/users/repositories/user-role.repository.interface';

export interface CreateUserCommand {
  email: string;
  password: string;
  role: Role;
  status?: UserStatus;
  emailVerified?: boolean;
  companyId?: string;
  companyRole?: CompanyMemberRole;
  candidate?: RegisterCandidateData;
  actorUserId: string;
  ip: string;
  userAgent: string;
}

/**
 * Alta de cuentas desde el back-office. Escribe usuario, `user_roles` y el
 * perfil correspondiente (candidato o membresía de empresa) en una única
 * transacción. La cuenta nace verificada salvo indicación contraria: el envío
 * de correo (M4) no está disponible en todos los entornos y una cuenta sin
 * verificar no podría iniciar sesión.
 */
@Injectable()
export class CreateUserUseCase {
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
    private readonly audit: AuditService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async execute(command: CreateUserCommand): Promise<UserResponseDto> {
    const email = command.email.trim().toLowerCase();

    if (await this.users.findByEmail(email)) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.AUTH_EMAIL_ALREADY_EXISTS,
        'Ya existe una cuenta con este correo.',
      );
    }

    const role = await this.roles.findByCode(command.role);
    if (!role) {
      throw new AppException(
        HttpStatus.INTERNAL_SERVER_ERROR,
        ErrorCode.INTERNAL_ERROR,
        `El rol ${command.role} no existe. Ejecuta el seed RBAC.`,
      );
    }

    let company: Company | null = null;
    if (command.role === Role.EMPLOYER) {
      company = await this.findCompanyOrFail(command.companyId);
    }
    if (command.role === Role.CANDIDATE) {
      await this.assertCandidateData(command.candidate);
    }

    const companyRole = command.companyRole ?? CompanyMemberRole.ADMIN;

    const user = new User();
    user.email = email;
    user.passwordHash = await this.hasher.hash(command.password);
    user.role = command.role;
    user.status = command.status ?? UserStatus.ACTIVE;
    user.emailVerifiedAt = command.emailVerified === false ? null : new Date();

    let created!: User;
    await runInTransaction(this.dataSource, async (manager) => {
      created = await this.users.save(user, manager);
      await this.userRoles.add(created.id, role.id, manager);

      if (company) {
        const member = new CompanyUser();
        member.companyId = company.id;
        member.userId = created.id;
        member.role = companyRole;
        await this.companyUsers.save(member, manager);
      }

      if (command.role === Role.CANDIDATE) {
        const data = command.candidate!;
        const profile = new CandidateProfile();
        profile.userId = created.id;
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
          action: 'users.create',
          actorUserId: command.actorUserId,
          entity: 'user',
          entityId: created.id,
          ip: command.ip,
          userAgent: command.userAgent,
          metadata: {
            role: command.role,
            status: user.status,
            companyId: command.companyId ?? null,
          },
        },
        manager,
      );
    });

    return toUserResponse(created, {
      displayName: command.candidate
        ? `${command.candidate.firstName} ${command.candidate.lastName}`.trim()
        : (company?.businessName ?? null),
      companyId: company?.id ?? null,
      companyName: company?.businessName ?? null,
      companyRole: company ? companyRole : null,
    });
  }

  private async findCompanyOrFail(companyId?: string): Promise<Company> {
    const company = companyId
      ? await this.companies.findById(companyId)
      : null;
    if (!company) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.COMPANY_NOT_FOUND,
        'La empresa seleccionada no existe.',
      );
    }
    return company;
  }

  private async assertCandidateData(
    data?: RegisterCandidateData,
  ): Promise<void> {
    if (!data) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.VALIDATION_ERROR,
        'Faltan los datos del candidato.',
      );
    }
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
}
