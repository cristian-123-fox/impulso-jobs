import { EntityManager, ObjectLiteral, Repository } from 'typeorm';

/**
 * Base de los repositorios de dominio. Único punto que toca TypeORM. Permite
 * operar dentro de una transacción resolviendo el repositorio contra el
 * `EntityManager` activo (para `runInTransaction`).
 */
export abstract class BaseRepository<T extends ObjectLiteral> {
  protected constructor(private readonly baseRepo: Repository<T>) {}

  /** Repositorio ligado al manager transaccional, o el por defecto. */
  protected repo(manager?: EntityManager): Repository<T> {
    return manager
      ? manager.getRepository<T>(this.baseRepo.target)
      : this.baseRepo;
  }
}
