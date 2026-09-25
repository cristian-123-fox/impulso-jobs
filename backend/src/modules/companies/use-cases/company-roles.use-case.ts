import { randomBytes } from 'node:crypto';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { RoleScope } from '@/common/types/role-scope.enum';
import { Role as PlatformRole } from '@/common/types/role.enum';
import { runInTransaction } from '@/common/utils/transaction.util';
import { AuditService } from '@/modules/audit/audit.service';
import {
  CompanyPermissionCatalogDto,
  CompanyPermissionDto,
  CompanyRoleResponseDto,
  SaveCompanyRoleDto,
} from '@/modules/companies/dto/company-role.dto';
import {
  PERMISSION_GROUPS,
  SCOPE_BASELINE,
  permissionMeta,
} from '@/modules/iam/permissions/catalogs/permission-catalog';
import { Permission } from '@/modules/iam/permissions/entities/permission.entity';
import {
  type IPermissionRepository,
  PERMISSION_REPOSITORY,
} from '@/modules/iam/permissions/repositories/permission.repository.interface';
import {
  type IRolePermissionRepository,
  ROLE_PERMISSION_REPOSITORY,
} from '@/modules/iam/permissions/repositories/role-permission.repository.interface';
import { PermissionsService } from '@/modules/iam/permissions/services/permissions.service';
import { Role } from '@/modules/iam/roles/entities/role.entity';
import {
  type IRoleRepository,
  ROLE_REPOSITORY,
} from '@/modules/iam/roles/repositories/role.repository.interface';
import {
  type IUserRoleRepository,
  USER_ROLE_REPOSITORY,
} from '@/modules/iam/users/repositories/user-role.repository.interface';

export interface CompanyRoleActor {
  actorUserId: string;
  ip: string;
  userAgent: string;
}

/** Lo que la empresa puede repartir, ya resuelto para validar. */
interface Assignable {
  /** code → permiso, sólo los que se pueden marcar o desmarcar. */
  editable: Map<string, Permission>;
  /** Los que todo rol de empresa tiene siempre. */
  locked: Set<string>;
  catalog: CompanyPermissionDto[];
}

/**
 * Roles propios de una empresa: perfiles de permisos que el propietario o un
 * administrador define para su equipo ("Reclutador junior": ver vacantes y
 * mover postulaciones, sin contratar planes).
 *
 * Tres reglas que dan forma a todo lo demás:
 *
 * 1. **Nunca más que EMPLOYER.** Sólo se ofrecen permisos de ámbito empresa
 *    que el rol EMPLOYER tenga hoy. `PermissionsService` lo vuelve a recortar
 *    al evaluar, así que un permiso retirado de EMPLOYER desaparece también de
 *    los roles de empresa sin tocar sus filas.
 * 2. **Aislados por empresa.** El rol lleva `company_id`, la empresa sale
 *    siempre de la sesión y un id de otra empresa responde igual que uno que
 *    no existe.
 * 3. **La base del ámbito no se reparte.** Leer catálogos o gestionar la propia
 *    cuenta los tiene cualquier rol (`SCOPE_BASELINE`): se enseñan bloqueados y
 *    no se escriben en `role_permissions`.
 *
 * Asignar el rol a una persona es cosa de `CompanyMembersUseCase`.
 */
@Injectable()
export class CompanyRolesUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roles: IRoleRepository,
    @Inject(ROLE_PERMISSION_REPOSITORY)
    private readonly rolePermissions: IRolePermissionRepository,
    @Inject(PERMISSION_REPOSITORY)
    private readonly permissions: IPermissionRepository,
    @Inject(USER_ROLE_REPOSITORY)
    private readonly userRoles: IUserRoleRepository,
    private readonly permissionsService: PermissionsService,
    private readonly audit: AuditService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /** Permisos que la empresa puede repartir, agrupados como en el back-office. */
  async catalog(): Promise<CompanyPermissionCatalogDto> {
    const { catalog } = await this.assignable();
    const used = new Set(catalog.map((permission) => permission.group));
    return {
      groups: PERMISSION_GROUPS.filter((group) => used.has(group.key)).map(
        (group) => ({ ...group }),
      ),
      permissions: catalog,
    };
  }

  async list(companyId: string): Promise<CompanyRoleResponseDto[]> {
    const roles = await this.roles.findByCompanyId(companyId);
    if (roles.length === 0) return [];

    const codeById = new Map(
      (await this.permissions.findAll()).map((p) => [p.id, p.code]),
    );
    return Promise.all(
      roles.map(async (role) => {
        const [permissionIds, memberCount] = await Promise.all([
          this.rolePermissions.findPermissionIdsByRoleId(role.id),
          this.userRoles.countByRoleId(role.id),
        ]);
        return this.toResponse(
          role,
          permissionIds
            .map((id) => codeById.get(id))
            .filter((code): code is string => Boolean(code)),
          memberCount,
        );
      }),
    );
  }

  async create(
    companyId: string,
    dto: SaveCompanyRoleDto,
    actor: CompanyRoleActor,
  ): Promise<CompanyRoleResponseDto> {
    await this.assertNameAvailable(companyId, dto.name);
    const permissions = await this.resolvePermissions(dto.permissionCodes);

    const role = new Role();
    // El código es interno: la empresa sólo ve el nombre. Es único en toda la
    // tabla (`uq_roles_code`), así que se genera en vez de derivarlo del
    // nombre, que dos empresas pueden repetir.
    role.code = `CO_${randomBytes(6).toString('hex').toUpperCase()}`;
    role.name = dto.name;
    role.description = dto.description?.trim() || null;
    role.scope = RoleScope.COMPANY;
    role.isSystem = false;
    role.companyId = companyId;

    const saved = await runInTransaction(this.dataSource, async (manager) => {
      const created = await this.roles.save(role, manager);
      await this.rolePermissions.addMany(
        created.id,
        permissions.map((p) => p.id),
        manager,
      );
      await this.audit.record(
        {
          action: 'company_roles.create',
          actorUserId: actor.actorUserId,
          entity: 'role',
          entityId: created.id,
          ip: actor.ip,
          userAgent: actor.userAgent,
          metadata: {
            companyId,
            name: created.name,
            permissions: permissions.map((p) => p.code),
          },
        },
        manager,
      );
      return created;
    });

    this.permissionsService.invalidate();
    return this.toResponse(
      saved,
      permissions.map((p) => p.code),
      0,
    );
  }

  async update(
    companyId: string,
    roleId: string,
    dto: SaveCompanyRoleDto,
    actor: CompanyRoleActor,
  ): Promise<CompanyRoleResponseDto> {
    const role = await this.requireOwnRole(companyId, roleId);
    await this.assertNameAvailable(companyId, dto.name, role.id);
    const permissions = await this.resolvePermissions(dto.permissionCodes);

    role.name = dto.name;
    role.description = dto.description?.trim() || null;

    const saved = await runInTransaction(this.dataSource, async (manager) => {
      const updated = await this.roles.save(role, manager);
      // Se guarda el conjunto completo, como el árbol del back-office: más
      // simple que calcular altas y bajas, y el rol de empresa es pequeño.
      await this.rolePermissions.removeByRoleId(updated.id, manager);
      await this.rolePermissions.addMany(
        updated.id,
        permissions.map((p) => p.id),
        manager,
      );
      await this.audit.record(
        {
          action: 'company_roles.update',
          actorUserId: actor.actorUserId,
          entity: 'role',
          entityId: updated.id,
          ip: actor.ip,
          userAgent: actor.userAgent,
          metadata: {
            companyId,
            name: updated.name,
            permissions: permissions.map((p) => p.code),
          },
        },
        manager,
      );
      return updated;
    });

    // Los miembros con el rol lo notan en su siguiente petición: los roles se
    // leen de la BD en cada una, no viajan en el token.
    this.permissionsService.invalidate();
    return this.toResponse(
      saved,
      permissions.map((p) => p.code),
      await this.userRoles.countByRoleId(saved.id),
    );
  }

  /**
   * Borra un rol sin miembros. Con miembros se rechaza en vez de devolverlos
   * al acceso completo en silencio: quien restringió a alguien no espera que
   * borrar un rol le dé de golpe permiso para pagar.
   */
  async remove(
    companyId: string,
    roleId: string,
    actor: CompanyRoleActor,
  ): Promise<void> {
    const role = await this.requireOwnRole(companyId, roleId);
    const assigned = await this.userRoles.countByRoleId(role.id);
    if (assigned > 0) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.COMPANY_ROLE_IN_USE,
        assigned === 1
          ? 'Una persona del equipo tiene este rol. Cámbiale el rol antes de borrarlo.'
          : `${assigned} personas del equipo tienen este rol. Cámbiales el rol antes de borrarlo.`,
      );
    }

    await runInTransaction(this.dataSource, async (manager) => {
      await this.rolePermissions.removeByRoleId(role.id, manager);
      await this.roles.remove(role.id, manager);
      await this.audit.record(
        {
          action: 'company_roles.delete',
          actorUserId: actor.actorUserId,
          entity: 'role',
          entityId: role.id,
          ip: actor.ip,
          userAgent: actor.userAgent,
          metadata: { companyId, name: role.name },
        },
        manager,
      );
    });
    this.permissionsService.invalidate();
  }

  /** El rol, si es de esta empresa. Uno ajeno responde igual que uno inexistente. */
  async requireOwnRole(companyId: string, roleId: string): Promise<Role> {
    const role = await this.roles.findById(roleId);
    if (!role || role.companyId !== companyId) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.COMPANY_ROLE_NOT_FOUND,
        'El rol no existe.',
      );
    }
    return role;
  }

  // ------------------------------------------------------------- privados

  /**
   * Lo repartible: permisos de ámbito empresa que EMPLOYER tiene hoy. Se
   * calcula con `PermissionsService`, así que refleja lo que el back-office
   * haya marcado en `/admin/roles` para EMPLOYER, no una lista fija.
   */
  private async assignable(): Promise<Assignable> {
    const employer = await this.roles.findByCode(PlatformRole.EMPLOYER);
    const ceiling = employer
      ? await this.permissionsService.permissionsForRoles([employer.id])
      : new Set<string>();
    const locked = new Set<string>(SCOPE_BASELINE[RoleScope.COMPANY]);

    const editable = new Map<string, Permission>();
    const catalog: CompanyPermissionDto[] = [];
    for (const permission of await this.permissions.findAll()) {
      const meta = permissionMeta(permission.code);
      if (!meta.scopes.includes(RoleScope.COMPANY)) continue;
      const isLocked = locked.has(permission.code);
      if (!isLocked && !ceiling.has(permission.code)) continue;

      if (!isLocked) editable.set(permission.code, permission);
      catalog.push({
        code: permission.code,
        label: meta.label,
        description: meta.description,
        group: meta.group,
        locked: isLocked,
      });
    }
    return { editable, locked, catalog };
  }

  /**
   * Traduce los códigos pedidos a permisos, rechazando lo que no se puede
   * repartir. Los fijos se descartan en silencio: marcarlos no es un error,
   * simplemente no hace falta guardarlos.
   */
  private async resolvePermissions(codes: string[]): Promise<Permission[]> {
    const { editable, locked } = await this.assignable();
    const requested = [...new Set(codes)].filter((code) => !locked.has(code));
    const rejected = requested.filter((code) => !editable.has(code));
    if (rejected.length > 0) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.VALIDATION_ERROR,
        `Estos permisos no se pueden dar a un rol de empresa: ${rejected.join(', ')}.`,
      );
    }
    return requested.map((code) => editable.get(code)!);
  }

  private async assertNameAvailable(
    companyId: string,
    name: string,
    exceptId?: string,
  ): Promise<void> {
    const normalized = name.trim().toLowerCase();
    const taken = (await this.roles.findByCompanyId(companyId)).some(
      (role) =>
        role.id !== exceptId && role.name.trim().toLowerCase() === normalized,
    );
    if (taken) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.COMPANY_ROLE_NAME_TAKEN,
        'Ya tienes un rol con ese nombre.',
      );
    }
  }

  private toResponse(
    role: Role,
    permissionCodes: string[],
    memberCount: number,
  ): CompanyRoleResponseDto {
    return {
      id: role.id,
      name: role.name,
      description: role.description ?? null,
      permissionCodes: [...permissionCodes].sort(),
      memberCount,
      createdAt: role.createdAt.toISOString(),
    };
  }
}
