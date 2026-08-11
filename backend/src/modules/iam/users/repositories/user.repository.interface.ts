import { EntityManager } from 'typeorm';
import { Role } from '@/common/types/role.enum';
import { UserStatus } from '@/common/types/user-status.enum';
import { User } from '@/modules/iam/users/entities/user.entity';

export const USER_REPOSITORY = 'USER_REPOSITORY';

/** Filtros del listado administrativo de usuarios (`GET /admin/users`). */
export interface UserSearchCriteria {
  /** Coincidencia parcial sobre el correo. */
  search?: string;
  role?: Role;
  status?: UserStatus;
  /** `true` = sólo verificados, `false` = sólo sin verificar. */
  emailVerified?: boolean;
  /** `true` = sólo las cuentas dadas de baja (M13, para restaurarlas). */
  deleted?: boolean;
  page: number;
  limit: number;
}

export interface IUserRepository {
  findByEmail(email: string, manager?: EntityManager): Promise<User | null>;
  findById(id: string, manager?: EntityManager): Promise<User | null>;
  findByIds(ids: string[], manager?: EntityManager): Promise<User[]>;
  save(user: User, manager?: EntityManager): Promise<User>;
  /** Página de usuarios + total, ordenados por fecha de alta descendente. */
  findAndCount(
    criteria: UserSearchCriteria,
    manager?: EntityManager,
  ): Promise<[User[], number]>;
  /** Conteo por estado/rol para las tarjetas del listado. */
  countBy(
    where: { role?: Role; status?: UserStatus },
    manager?: EntityManager,
  ): Promise<number>;
  softDelete(id: string, manager?: EntityManager): Promise<void>;
  /**
   * Incluye las cuentas dadas de baja. Necesario para restaurarlas y para la
   * purga por retención (M13): el resto de consultas las excluye.
   */
  findByIdIncludingDeleted(
    id: string,
    manager?: EntityManager,
  ): Promise<User | null>;
  /** Deshace la baja lógica (`deleted_at = NULL`). */
  restore(id: string, manager?: EntityManager): Promise<void>;
  /** Cuentas dadas de baja antes de la fecha indicada (purga por retención). */
  findDeletedBefore(cutoff: Date, manager?: EntityManager): Promise<User[]>;
  /** Borrado físico. Sólo lo usa la purga tras el periodo de retención. */
  hardDelete(id: string, manager?: EntityManager): Promise<void>;
}
