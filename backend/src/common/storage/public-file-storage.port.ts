export const PUBLIC_FILE_STORAGE = 'PUBLIC_FILE_STORAGE';

export interface SavePublicFile {
  /** Ruta relativa dentro del área pública, p. ej. `candidate-photos/<id>.png`. */
  key: string;
  buffer: Buffer;
}

/**
 * Almacenamiento de archivos PÚBLICOS (foto de perfil, logo de empresa): todo
 * lo guardado aquí queda servido sin autenticación bajo `/uploads` (main.ts).
 * Los archivos privados (CV) NO pasan por este puerto — usan
 * `CANDIDATE_RESUME_STORAGE` y bajan por endpoint autenticado.
 */
export interface PublicFileStoragePort {
  save(file: SavePublicFile): Promise<void>;
  delete(key: string): Promise<void>;
  /** URL absoluta con la que un navegador puede pedir el archivo. */
  publicUrl(key: string): string;
}
