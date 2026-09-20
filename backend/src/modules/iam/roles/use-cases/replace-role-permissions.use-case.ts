import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { RoleScope } from '@/common/types/role-scope.enum';
import { runInTransaction } from '@/common/utils/transaction.util';
import { AuditService } from '@/modules/audit/audit.service';
import {
  lockedPermissionCodes,
  permissionMeta,
} from '@/modules/iam/permissions/catalogs/permission-catalog';
import { PermissionsService } from '@/modules/iam/permissions/services/permissions.service';
import {
  type IPermissionRepository,
  PERMISSION_REPOSITORY,
} from '@/modules/iam/permissions/repositories/permission.repository.interface';
import {
  type IRolePermissionRepository,
  ROLE_PERMISSION_REPOSITORY,
} from '@/modules/iam/permissions/repositories/role-permission.repository.interface';
import {
  type IRoleRepository,
  ROLE_REPOSITORY,
} from '@/modules/iam/roles/repositories/role.repository.interface';

export interface ReplaceRolePermissionsCommand {
  roleId: string;
  permissionIds: string[];
  actorUserId: string;
  ip: string;
  userAgent: string;
}

/**
 * Reemplaza de una vez los permisos de un rol: es lo que guarda el árbol de
 * `/admin/roles/:id`.
 *
 * Existe porque marcar un grupo entero mueve ocho o diez casillas a la vez, y
 * hacerlo con el alta/baja individual serían diez peticiones que pueden fallar
 * a medias y dejar el rol en un estado que nadie pidió.
 *
 * Tres reglas que aplica y conviene no perder:
 *
 * 1. **El rol del aspirante no se administra.** Su ámbito tiene los permisos
 *    fijados en código; aceptar una escritura aquí daría la falsa impresión de
 *    que se puede quitar algo que el guard concede igualmente.
 * 2. **Los permisos base no se guardan ni se borran.** Vienen del ámbito
 *    (`SCOPE_BASELINE`) y del blindaje del rol de sistema; escribirlos en
 *    `role_permissions` duplicaría la fuente de la verdad.
 * 3. **Sólo se ofrecen los permisos del ámbito del rol.** Un rol de empresa no
 *    puede acabar con `users.delete` porque alguien manipulara la petición.
 */
@Injectable()
export class ReplaceRolePermissionsUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roles: IRoleRepository,
    @Inject(PERMISSION_REPOSITORY)
    private readonly permissions: IPermissionRepository,
    @Inject(ROLE_PERMISSION_REPOSITORY)
    private readonly rolePermissions: IRolePermissionRepository,
    private readonly permissionsService: PermissionsService,
    private readonly audit: AuditService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async execute(command: ReplaceRolePermissionsCommand): Promise<string[]> {
    const role = await this.roles.findById(command.roleId);
    if (!role) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.ROLE_NOT_FOUND,
        'Rol no encontrado.',
      );
    }

    const scope = role.scope ?? RoleScope.PLATFORM;
    if (scope === RoleScope.CANDIDATE) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.ROLE_IMMUTABLE,
        'El rol del aspirante no se administra: sus permisos son fijos.',
      );
    }

    const requested = [...new Set(command.permissionIds)];
    const catalog = await this.permissions.findAll();
    const byId = new Map(
      catalog.map((permission) => [permission.id, permission]),
    );

    const missing = requested.filter((id) => !byId.has(id));
    if (missing.length > 0) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.PERMISSION_NOT_FOUND,
        'Alguno de los permisos no existe.',
      );
    }

    const locked = lockedPermissionCodes(scope, role.code, role.isSystem);
    const outOfScope = requested
      .map((id) => byId.get(id)!)
      .filter(
        (permission) =>
          !locked.has(permission.code) &&
          !permissionMeta(permission.code).scopes.includes(scope),
      );
    if (outOfScope.length > 0) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.VALIDATION_ERROR,
        `Estos permisos no aplican a este tipo de rol: ${outOfScope
          .map((permission) => permission.code)
          .join(', ')}.`,
      );
    }

    // Lo base se ignora en los dos sentidos: ni se añade ni se retira.
    const lockedIds = new Set(
      catalog
        .filter((permission) => locked.has(permission.code))
        .map((permission) => permission.id),
    );
    const editable = new Set(requested.filter((id) => !lockedIds.has(id)));

    const current = await this.rolePermissions.findPermissionIdsByRoleId(
      role.id,
    );
    const currentEditable = current.filter((id) => !lockedIds.has(id));

    const toAdd = [...editable].filter((id) => !current.includes(id));
    const toRemove = currentEditable.filter((id) => !editable.has(id));

    if (toAdd.length === 0 && toRemove.length === 0) return current;

    await runInTransaction(this.dataSource, async (manager) => {
      await this.rolePermissions.removeMany(role.id, toRemove, manager);
      await this.rolePermissions.addMany(role.id, toAdd, manager);
    });

    // El guard lee un mapa cacheado (rol → permisos): sin esto seguiría el viejo.
    this.permissionsService.invalidate();

    const codeOf = (id: string): string => byId.get(id)?.code ?? id;
    await this.audit.record({
      action: 'permissions.assign',
      actorUserId: command.actorUserId,
      entity: 'role',
      entityId: role.id,
      ip: command.ip,
      userAgent: command.userAgent,
      metadata: {
        role: role.code,
        added: toAdd.map(codeOf),
        removed: toRemove.map(codeOf),
      },
    });

    return this.rolePermissions.findPermissionIdsByRoleId(role.id);
  }
}
