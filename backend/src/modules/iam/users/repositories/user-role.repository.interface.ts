import { EntityManager } from 'typeorm';

export const USER_ROLE_REPOSITORY = 'USER_ROLE_REPOSITORY';

export interface IUserRoleRepository {
  findRoleIdsByUserId(userId: string): Promise<string[]>;
  exists(userId: string, roleId: string): Promise<boolean>;
  add(userId: string, roleId: string, manager?: EntityManager): Promise<void>;
  remove(
    userId: string,
    roleId: string,
    manager?: EntityManager,
  ): Promise<void>;
}
