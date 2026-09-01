import { createReadStream, promises as fs } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { Injectable } from '@nestjs/common';
import { uploadsDir } from '@/common/storage/uploads-dir';
import { IApplicationResumeSnapshotStorage } from '@/modules/applications/services/application-resume-snapshot-storage.port';

/**
 * Guarda los snapshots en `<UPLOADS_DIR>/application-resumes/<applicationId>.pdf`,
 * FUERA de `<UPLOADS_DIR>/public` (no se sirven estáticamente). A diferencia
 * del storage de CVs vivos (que fija `process.cwd()`), éste respeta
 * `UPLOADS_DIR`; con la variable sin definir ambos caen en `./uploads`.
 */
@Injectable()
export class LocalApplicationResumeSnapshotStorageService implements IApplicationResumeSnapshotStorage {
  private readonly baseDir = resolve(uploadsDir(), 'application-resumes');

  async save(
    applicationId: string,
    buffer: Buffer,
  ): Promise<{ storageKey: string }> {
    const storageKey = `${applicationId}.pdf`;
    const fullPath = this.resolveContained(storageKey);
    await fs.mkdir(dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, buffer);
    return { storageKey };
  }

  async openReadStream(storageKey: string) {
    const fullPath = this.resolveContained(storageKey);
    await fs.access(fullPath);
    return createReadStream(fullPath);
  }

  async delete(storageKey: string): Promise<void> {
    await fs.unlink(this.resolveContained(storageKey));
  }

  /** Rechaza claves que intenten salir del directorio base. */
  private resolveContained(storageKey: string): string {
    const fullPath = resolve(this.baseDir, storageKey);
    if (!fullPath.startsWith(this.baseDir)) {
      throw new Error(`Clave de snapshot fuera del directorio: ${storageKey}`);
    }
    return fullPath;
  }
}
