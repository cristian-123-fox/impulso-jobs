import { DataSource, EntityManager } from 'typeorm';

/**
 * Ejecuta `work` dentro de una transacción con rollback automático ante error.
 * Se orquesta desde los use-cases; los repositorios aceptan el `EntityManager`.
 */
export function runInTransaction<T>(
  dataSource: DataSource,
  work: (manager: EntityManager) => Promise<T>,
): Promise<T> {
  return dataSource.transaction(work);
}
