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
  CompanyMemberAccessRoleDto,
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
import { CompanyRolesUseCase } from '@/modules/companies/use-cases/company-roles.use-case';
import { PasswordHasherService } from '@/modules/iam/auth/services/password-hasher.service';
import { Role } from '@/modules/iam/roles/entities/role.entity';
import {
  type IRoleRepository,
  ROLE_REPOSITORY,
} from '@/modules/iam/roles/repositories/role.repository.interface';
import { EntityManager } from 'typeorm';
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
  /** Rol de empresa; `null`/omitido = acceso completo. */
  accessRoleId?: string | null;
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
  /** `null` = acceso completo; omitido = se conserva el actual. */
  accessRoleId?: string | null;
}

export interface RemoveMemberCommand extends ActorInfo {
  companyId: string;
  userId: string;
}

/**
 * Equipo de una empresa (`company_users`), desde el back-office y desde el
 * autoservicio. Cada miembro tiene dos cosas distintas:
 *
 * - **Rol interno** (`company_users.role`: OWNER/ADMIN/RECRUITER/MEMBER): quién
 *   manda sobre el equipo. No alimenta el `PermissionsGuard`.
 * - **Rol de acceso**: qué puede hacer en la plataforma. Por defecto el rol
 *   EMPLOYER completo; la empresa puede sustituirlo por uno de sus roles
 *   (`CompanyRolesUseCase`) para limitarlo. Se guarda **en `user_roles`**,
 *   reemplazando a EMPLOYER: es lo que ya lee el guard en cada petición, así
 *   que el cambio surte efecto sin volver a iniciar sesión.
 *
 * Invariantes: toda empresa conserva al menos un OWNER; OWNER y ADMIN tienen
 * siempre el acceso completo —si no, un administrador podría quitarse a sí
 * mismo la gestión del equipo y dejar la empresa sin llave—; un usuario
 * pertenece a una sola empresa.
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
    private readonly companyRoles: CompanyRolesUseCase,
  ) {}

  async list(companyId: string): Promise<CompanyMemberResponseDto[]> {
    await this.requireCompany(companyId);
    const memberships = await this.members.findByCompanyId(companyId);
    const userIds = memberships.map((m) => m.userId);
    const [users, companyRoles, assignments] = await Promise.all([
      this.users.findByIds(userIds),
      this.roles.findByCompanyId(companyId),
      this.userRoles.findByUserIds(userIds),
    ]);
    const byId = new Map(users.map((u) => [u.id, u]));
    const roleById = new Map(companyRoles.map((r) => [r.id, r]));
    const accessByUser = new Map<string, CompanyMemberAccessRoleDto>();
    for (const { userId, roleId } of assignments) {
      const role = roleById.get(roleId);
      if (role) accessByUser.set(userId, { id: role.id, name: role.name });
    }

    return memberships
      .filter((m) => byId.has(m.userId))
      .map((m) =>
        toCompanyMemberResponse(
          m,
          byId.get(m.userId)!,
          accessByUser.get(m.userId) ?? null,
        ),
      )
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
    const accessRole = await this.resolveAccessRole(
      command.companyId,
      command.role,
      command.accessRoleId ?? null,
    );

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
        // El rol (EMPLOYER o el de empresa) lo pone `applyAccessRole` más
        // abajo: añadirlo aquí dejaría EMPLOYER junto al rol restringido, y
        // los permisos se unen.
        account = await this.users.save(created, manager);
      }

      const membership = new CompanyUser();
      membership.companyId = command.companyId;
      membership.userId = account.id;
      membership.role = command.role;
      member = await this.members.save(membership, manager);
      await this.applyAccessRole(
        command.companyId,
        account.id,
        accessRole,
        manager,
      );

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
            accessRoleId: accessRole?.id ?? null,
            createdAccount: !user,
          },
        },
        manager,
      );
    });

    return toCompanyMemberResponse(member, account, this.toAccess(accessRole));
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

    // Omitido = se conserva el rol de acceso que tuviera (salvo que ahora sea
    // OWNER/ADMIN, que siempre tienen el completo).
    const requested =
      command.accessRoleId === undefined
        ? ((await this.currentAccessRole(command.companyId, command.userId))
            ?.id ?? null)
        : command.accessRoleId;
    const accessRole = await this.resolveAccessRole(
      command.companyId,
      command.role,
      requested,
      command.accessRoleId === undefined,
    );

    const saved = await runInTransaction(this.dataSource, async (manager) => {
      const result = await this.members.save(membership, manager);
      await this.applyAccessRole(
        command.companyId,
        command.userId,
        accessRole,
        manager,
      );
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
            accessRoleId: accessRole?.id ?? null,
          },
        },
        manager,
      );
      return result;
    });

    return toCompanyMemberResponse(saved, user, this.toAccess(accessRole));
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
      // Fuera de la empresa, un rol de esa empresa no significa nada: la cuenta
      // vuelve a EMPLOYER, como cualquier cuenta de empresa sin equipo.
      await this.applyAccessRole(
        command.companyId,
        command.userId,
        null,
        manager,
      );
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

  /**
   * Autoservicio: resuelve la empresa del usuario en sesión vía `company_users`
   * y comprueba que su rol interno permita tocar el equipo.
   *
   * El permiso `company_users.manage` lo tiene **todo** EMPLOYER, así que sin
   * esto un reclutador podría dar de alta cuentas. Mandar sobre el equipo es de
   * OWNER y ADMIN; el resto sólo lo consulta.
   */
  async resolveOwnCompanyId(
    userId: string,
    options: { manage?: boolean } = {},
  ): Promise<string> {
    const membership = await this.members.findByUserId(userId);
    if (!membership) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.COMPANY_NOT_FOUND,
        'Tu cuenta no está vinculada a ninguna empresa.',
      );
    }

    if (options.manage && !this.canManage(membership.role)) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        ErrorCode.PERMISSION_DENIED,
        'Sólo el propietario o un administrador pueden gestionar el equipo.',
      );
    }

    return membership.companyId;
  }

  /** El rol de empresa que tiene hoy el miembro, si tiene alguno. */
  private async currentAccessRole(
    companyId: string,
    userId: string,
  ): Promise<Role | null> {
    const [companyRoles, roleIds] = await Promise.all([
      this.roles.findByCompanyId(companyId),
      this.userRoles.findRoleIdsByUserId(userId),
    ]);
    return companyRoles.find((role) => roleIds.includes(role.id)) ?? null;
  }

  /**
   * Valida el rol de acceso pedido. OWNER y ADMIN no admiten uno: tienen el
   * acceso completo. Al promover a alguien restringido a ADMIN se le devuelve
   * el completo sin error (`implicit`), porque ahí nadie pidió restringirlo.
   */
  private async resolveAccessRole(
    companyId: string,
    internalRole: CompanyMemberRole,
    accessRoleId: string | null,
    implicit = false,
  ): Promise<Role | null> {
    if (!accessRoleId) return null;
    if (this.canManage(internalRole)) {
      if (implicit) return null;
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.COMPANY_ROLE_NOT_ASSIGNABLE,
        'El propietario y los administradores tienen siempre el acceso completo.',
      );
    }
    return this.companyRoles.requireOwnRole(companyId, accessRoleId);
  }

  /**
   * Deja en `user_roles` el acceso pedido: el rol de empresa **en lugar de**
   * EMPLOYER, o EMPLOYER solo. Los permisos se unen entre roles, así que
   * mantener EMPLOYER junto al rol de empresa no restringiría nada.
   */
  private async applyAccessRole(
    companyId: string,
    userId: string,
    accessRole: Role | null,
    manager: EntityManager,
  ): Promise<void> {
    const employer = await this.roles.findByCode(PlatformRole.EMPLOYER);
    if (!employer) {
      throw new AppException(
        HttpStatus.INTERNAL_SERVER_ERROR,
        ErrorCode.INTERNAL_ERROR,
        'El rol EMPLOYER no existe. Ejecuta el seed RBAC.',
      );
    }
    const companyRoleIds = new Set(
      (await this.roles.findByCompanyId(companyId)).map((role) => role.id),
    );
    const current = await this.userRoles.findRoleIdsByUserId(userId);

    for (const roleId of current) {
      if (companyRoleIds.has(roleId) && roleId !== accessRole?.id) {
        await this.userRoles.remove(userId, roleId, manager);
      }
    }
    if (accessRole) {
      if (!current.includes(accessRole.id)) {
        await this.userRoles.add(userId, accessRole.id, manager);
      }
      if (current.includes(employer.id)) {
        await this.userRoles.remove(userId, employer.id, manager);
      }
    } else if (!current.includes(employer.id)) {
      await this.userRoles.add(userId, employer.id, manager);
    }
  }

  private toAccess(role: Role | null): CompanyMemberAccessRoleDto | null {
    return role ? { id: role.id, name: role.name } : null;
  }

  private canManage(role: CompanyMemberRole): boolean {
    return role === CompanyMemberRole.OWNER || role === CompanyMemberRole.ADMIN;
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
