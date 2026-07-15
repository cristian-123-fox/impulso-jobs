import { Permission } from '@/modules/iam/permissions/entities/permission.entity';

export const PERMISSION_REPOSITORY = 'PERMISSION_REPOSITORY';

export interface IPermissionRepository {
  findAll(): Promise<Permission[]>;
  findById(id: string): Promise<Permission | null>;
  findByIds(ids: string[]): Promise<Permission[]>;
}
