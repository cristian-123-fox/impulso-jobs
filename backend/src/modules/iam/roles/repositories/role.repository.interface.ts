import { EntityManager } from 'typeorm';
import { Role } from '@/modules/iam/roles/entities/role.entity';

export const ROLE_REPOSITORY = 'ROLE_REPOSITORY';

export interface IRoleRepository {
  findAll(): Promise<Role[]>;
  findById(id: string): Promise<Role | null>;
  findByCode(code: string): Promise<Role | null>;
  findByIds(ids: string[]): Promise<Role[]>;
  existsByCode(code: string, exceptId?: string): Promise<boolean>;
  save(role: Role, manager?: EntityManager): Promise<Role>;
}
