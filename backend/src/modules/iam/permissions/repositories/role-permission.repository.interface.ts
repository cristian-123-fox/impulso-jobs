export const ROLE_PERMISSION_REPOSITORY = 'ROLE_PERMISSION_REPOSITORY';

export interface RolePermissionCode {
  roleId: string;
  code: string;
}

export interface IRolePermissionRepository {
  /** (roleId, permissionCode) de todas las asignaciones — para el guard. */
  findRolePermissionCodes(): Promise<RolePermissionCode[]>;
  findPermissionIdsByRoleId(roleId: string): Promise<string[]>;
  exists(roleId: string, permissionId: string): Promise<boolean>;
  add(roleId: string, permissionId: string): Promise<void>;
  remove(roleId: string, permissionId: string): Promise<void>;
}
