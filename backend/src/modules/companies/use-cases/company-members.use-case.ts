import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { Role as PlatformRole } from '@/common/types/role.enum';
import { UserStatus } from '@/common/types/user-status.enum';
import { runInTransaction } from '@/common/utils/transaction.util';
import { AuditService } from '@/modules/audit/audit.service';
import {
  CompanyMemberResponseDto,
  toCompanyMemberResponse,
} from '@/modules/companies/dto/company-member.dto';
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

export interface ActorInfo {
  actorUserId: string;
  ip: string;
  userAgent: string;
}

export interface AddMemberCommand extends ActorInfo {
  companyId: string;
  role: CompanyMemberRole;
  /** Vincular una cuenta existente… */
  userId?: string;
  /** …o crear una nueva cuenta EMPLOYER. */
  email?: string;
  password?: string;
}

export interface UpdateMemberRoleCommand extends ActorInfo {
  companyId: string;
  userId: string;
  role: CompanyMemberRole;
}

export interface RemoveMemberCommand extends ActorInfo {
  companyId: string;
  userId: string;
}

/**
 * Equipo de una empresa (`company_users`) desde el back-office. El rol interno
 * es la pertenencia dentro de la empresa (OWNER/ADMIN/RECRUITER/MEMBER); no es
 * rol de plataforma ni alimenta el `PermissionsGuard` — el acceso a estos
 * endpoints lo gobierna el permiso `company_users.manage`.
 *
 * Invariante: toda empresa conserva al menos un OWNER, así que no se puede
 * degradar ni quitar al último. Un usuario pertenece a una sola empresa.
 */
@Injectable()
export class CompanyMembersUseCase {
  constructor(
    @Inject(COMPANY_REPOSITORY) private readonly companies: ICompanyRepository,
    @Inject(COMPANY_USER_REPOSITORY)
    private readonly members: ICompanyUserRepository,
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(USER_ROLE_REPOSITORY)
    private readonly userRoles: IUserRoleRepository,
    @Inject(ROLE_REPOSITORY) private readonly roles: IRoleRepository,
    private readonly hasher: PasswordHasherService,
    private readonly audit: AuditService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async list(companyId: string): Promise<CompanyMemberResponseDto[]> {
    await this.requireCompany(companyId);
    const memberships = await this.members.findByCompanyId(companyId);
    const users = await this.users.findByIds(memberships.map((m) => m.userId));
    const byId = new Map(users.map((u) => [u.id, u]));

    return memberships
      .filter((m) => byId.has(m.userId))
      .map((m) => toCompanyMemberResponse(m, byId.get(m.userId)!))
      .sort((a, b) => this.rank(a.companyRole) - this.rank(b.companyRole));
  }

  async add(command: AddMemberCommand): Promise<CompanyMemberResponseDto> {
    await this.requireCompany(command.companyId);

    const user = command.userId
      ? await this.resolveExistingUser(command.companyId, command.userId)
      : null;
    if (!user) await this.assertEmailAvailable(command.email);

    const employerRole = await this.roles.findByCode(PlatformRole.EMPLOYER);
    if (!user && !employerRole) {
      throw new AppException(
        HttpStatus.INTERNAL_SERVER_ERROR,
        ErrorCode.INTERNAL_ERROR,
        'El rol EMPLOYER no existe. Ejecuta el seed RBAC.',
      );
    }

    const passwordHash = user
      ? null
      : await this.hasher.hash(command.password!);

    let member!: CompanyUser;
    let account!: User;

    await runInTransaction(this.dataSource, async (manager) => {
      if (user) {
        account = user;
      } else {
        const created = new User();
        created.email = command.email!.trim().toLowerCase();
        created.passwordHash = passwordHash!;
        created.role = PlatformRole.EMPLOYER;
        created.status = UserStatus.ACTIVE;
        created.emailVerifiedAt = new Date();
        account = await this.users.save(created, manager);
        await this.userRoles.add(account.id, employerRole!.id, manager);
      }

      const membership = new CompanyUser();
      membership.companyId = command.companyId;
      membership.userId = account.id;
      membership.role = command.role;
      member = await this.members.save(membership, manager);

      await this.audit.record(
        {
          action: 'company_users.add',
          actorUserId: command.actorUserId,
          entity: 'company_user',
          entityId: member.id,
          ip: command.ip,
          userAgent: command.userAgent,
          metadata: {
            companyId: command.companyId,
            userId: account.id,
            role: command.role,
            createdAccount: !user,
          },
        },
        manager,
      );
    });

    return toCompanyMemberResponse(member, account);
  }

  async updateRole(
    command: UpdateMemberRoleCommand,
  ): Promise<CompanyMemberResponseDto> {
    await this.requireCompany(command.companyId);
    const membership = await this.requireMembership(
      command.companyId,
      command.userId,
    );

    if (membership.role !== command.role) {
      await this.assertNotLastOwner(membership, 'degradar');
    }
    membership.role = command.role;

    const user = await this.users.findById(command.userId);
    if (!user) throw this.memberNotFound();

    const saved = await runInTransaction(this.dataSource, async (manager) => {
      const result = await this.members.save(membership, manager);
      await this.audit.record(
        {
          action: 'company_users.update',
          actorUserId: command.actorUserId,
          entity: 'company_user',
          entityId: result.id,
          ip: command.ip,
          userAgent: command.userAgent,
          metadata: {
            companyId: command.companyId,
            userId: command.userId,
            role: command.role,
          },
        },
        manager,
      );
      return result;
    });

    return toCompanyMemberResponse(saved, user);
  }

  async remove(command: RemoveMemberCommand): Promise<void> {
    await this.requireCompany(command.companyId);
    const membership = await this.requireMembership(
      command.companyId,
      command.userId,
    );
    await this.assertNotLastOwner(membership, 'quitar');

    await runInTransaction(this.dataSource, async (manager) => {
      await this.members.remove(command.companyId, command.userId, manager);
      await this.audit.record(
        {
          action: 'company_users.remove',
          actorUserId: command.actorUserId,
          entity: 'company_user',
          entityId: membership.id,
          ip: command.ip,
          userAgent: command.userAgent,
          metadata: {
            companyId: command.companyId,
            userId: command.userId,
            role: membership.role,
          },
        },
        manager,
      );
    });
  }

  /** Orden de presentación del equipo: primero quien más manda. */
  private rank(role: CompanyMemberRole): number {
    const order: Record<CompanyMemberRole, number> = {
      [CompanyMemberRole.OWNER]: 0,
      [CompanyMemberRole.ADMIN]: 1,
      [CompanyMemberRole.RECRUITER]: 2,
      [CompanyMemberRole.MEMBER]: 3,
    };
    return order[role] ?? 9;
  }

  private async requireCompany(companyId: string): Promise<void> {
    if (!(await this.companies.findById(companyId))) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.COMPANY_NOT_FOUND,
        'La empresa no existe.',
      );
    }
  }

  private async requireMembership(
    companyId: string,
    userId: string,
  ): Promise<CompanyUser> {
    const membership = await this.members.findOne(companyId, userId);
    if (!membership) throw this.memberNotFound();
    return membership;
  }

  /** Valida que la cuenta existente pueda vincularse a esta empresa. */
  private async resolveExistingUser(
    companyId: string,
    userId: string,
  ): Promise<User> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.USER_NOT_FOUND,
        'El usuario no existe.',
      );
    }
    if (user.role !== PlatformRole.EMPLOYER) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.COMPANY_MEMBER_INVALID_ACCOUNT,
        'Sólo las cuentas de tipo empresa pueden formar parte de un equipo.',
      );
    }

    const existing = await this.members.findByUserId(userId);
    if (existing?.companyId === companyId) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.COMPANY_MEMBER_ALREADY_EXISTS,
        'Este usuario ya pertenece al equipo de la empresa.',
      );
    }
    if (existing) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.COMPANY_MEMBER_IN_OTHER_COMPANY,
        'Este usuario ya pertenece a otra empresa.',
      );
    }
    return user;
  }

  private async assertEmailAvailable(email?: string): Promise<void> {
    const normalized = email?.trim().toLowerCase();
    if (!normalized) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.VALIDATION_ERROR,
        'Indica una cuenta existente o los datos de una nueva.',
      );
    }
    if (await this.users.findByEmail(normalized)) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.AUTH_EMAIL_ALREADY_EXISTS,
        'Ya existe una cuenta con este correo.',
      );
    }
  }

  /** Toda empresa conserva al menos un propietario. */
  private async assertNotLastOwner(
    membership: CompanyUser,
    action: 'degradar' | 'quitar',
  ): Promise<void> {
    if (membership.role !== CompanyMemberRole.OWNER) return;
    const owners = await this.members.countByRole(
      membership.companyId,
      CompanyMemberRole.OWNER,
    );
    if (owners <= 1) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.COMPANY_LAST_OWNER,
        `No puedes ${action} al único propietario de la empresa. Nombra antes a otro propietario.`,
      );
    }
  }

  private memberNotFound(): AppException {
    return new AppException(
      HttpStatus.NOT_FOUND,
      ErrorCode.COMPANY_MEMBER_NOT_FOUND,
      'El usuario no pertenece al equipo de esta empresa.',
    );
  }
}
