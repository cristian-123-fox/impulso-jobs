import { promises as fs } from 'node:fs';
import { Injectable } from '@nestjs/common';
import { dirname, resolve, sep } from 'node:path';
import {
  PublicFileStoragePort,
  SavePublicFile,
} from '@/common/storage/public-file-storage.port';
import { uploadsDir } from '@/common/storage/uploads-dir';

/**
 * Implementación en disco local (decisión de despliegue: cPanel sin bucket).
 * Escribe bajo `<UPLOADS_DIR>/public`, que main.ts sirve estático en
 * `/uploads`. Migrar a S3/Cloud = otra clase con este contrato y cambiar el
 * `useClass` en los módulos — mismo patrón que MAILER_PORT y PAYMENT_PROVIDER.
 */
@Injectable()
export class LocalPublicFileStorageAdapter implements PublicFileStoragePort {
  private readonly baseDir = resolve(uploadsDir(), 'public');
  private readonly baseUrl = (
    process.env.APP_PUBLIC_URL?.trim() ||
    `http://localhost:${process.env.PORT ?? 3000}`
  ).replace(/\/+$/, '');

  async save(file: SavePublicFile): Promise<void> {
    const fullPath = this.resolveContained(file.key);
    await fs.mkdir(dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, file.buffer);
  }

  async delete(key: string): Promise<void> {
    await fs.unlink(this.resolveContained(key));
  }

  publicUrl(key: string): string {
    return `${this.baseUrl}/uploads/${key}`;
  }

  /** Las claves vienen de código propio, pero jamás deben salir de baseDir. */
  private resolveContained(key: string): string {
    const fullPath = resolve(this.baseDir, key);
    if (!fullPath.startsWith(this.baseDir + sep)) {
      throw new Error(`Clave de almacenamiento inválida: ${key}`);
    }
    return fullPath;
  }
}
