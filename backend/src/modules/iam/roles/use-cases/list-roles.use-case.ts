import { Inject, Injectable } from '@nestjs/common';
import { Role } from '@/modules/iam/roles/entities/role.entity';
import {
  type IRoleRepository,
  ROLE_REPOSITORY,
} from '@/modules/iam/roles/repositories/role.repository.interface';
import {
  type IRolePermissionRepository,
  ROLE_PERMISSION_REPOSITORY,
} from '@/modules/iam/permissions/repositories/role-permission.repository.interface';

export interface RoleWithCount {
  role: Role;
  /** Permisos asignados a mano. No cuenta la base del ámbito, que es implícita. */
  permissionCount: number;
}

@Injectable()
export class ListRolesUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roles: IRoleRepository,
    @Inject(ROLE_PERMISSION_REPOSITORY)
    private readonly rolePermissions: IRolePermissionRepository,
  ) {}

  async execute(): Promise<RoleWithCount[]> {
    // Una consulta agrupada para todos los roles, no una por fila.
    const [roles, counts] = await Promise.all([
      this.roles.findAll(),
      this.rolePermissions.countByRole(),
    ]);
    return roles.map((role) => ({
      role,
      permissionCount: counts.get(role.id) ?? 0,
    }));
  }
}
