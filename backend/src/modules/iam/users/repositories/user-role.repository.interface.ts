import { EntityManager } from 'typeorm';

export const USER_ROLE_REPOSITORY = 'USER_ROLE_REPOSITORY';

export interface IUserRoleRepository {
  findRoleIdsByUserId(userId: string): Promise<string[]>;
  /** Pares (usuario, rol) de varios usuarios, para el listado admin sin N+1. */
  findByUserIds(
    userIds: string[],
  ): Promise<{ userId: string; roleId: string }[]>;
  exists(userId: string, roleId: string): Promise<boolean>;
  /** Cuántas cuentas tienen el rol. Bloquea el borrado de un rol en uso. */
  countByRoleId(roleId: string): Promise<number>;
  add(userId: string, roleId: string, manager?: EntityManager): Promise<void>;
  remove(
    userId: string,
    roleId: string,
    manager?: EntityManager,
  ): Promise<void>;
}
