import { resolve } from 'node:path';

/**
 * Raíz de los archivos subidos. En cPanel se decidió almacenar en el disco
 * local del servidor: bajo Passenger `process.cwd()` es el application root
 * (`~/api`), así que `uploads/` sobrevive a los deploys vía git pull.
 * `UPLOADS_DIR` permite sacarlo fuera del árbol de la app si hiciera falta.
 */
export function uploadsDir(): string {
  const fromEnv = process.env.UPLOADS_DIR?.trim();
  return fromEnv ? resolve(fromEnv) : resolve(process.cwd(), 'uploads');
}
