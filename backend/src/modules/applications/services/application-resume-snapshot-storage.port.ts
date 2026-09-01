import { ReadStream } from 'node:fs';

export const APPLICATION_RESUME_SNAPSHOT_STORAGE =
  'APPLICATION_RESUME_SNAPSHOT_STORAGE';

/**
 * Almacén de la COPIA congelada del CV que viajó con la postulación (T19).
 * Es privado: nunca se sirve por `/uploads`; sólo baja por el endpoint
 * autenticado de la empresa. Mismo patrón de puerto que
 * `CANDIDATE_RESUME_STORAGE` — migrar a S3 = cambiar el `useClass`.
 */
export interface IApplicationResumeSnapshotStorage {
  save(applicationId: string, buffer: Buffer): Promise<{ storageKey: string }>;
  openReadStream(storageKey: string): Promise<ReadStream>;
  delete(storageKey: string): Promise<void>;
}
