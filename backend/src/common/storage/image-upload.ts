import { HttpStatus } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Tope duro para el `FileInterceptor` de imágenes, por encima del máximo de
 * negocio: así los excesos "normales" llegan al use-case y salen con el
 * errorCode específico de la feature; multer solo corta cargas desmedidas.
 */
export const IMAGE_MULTER_LIMIT_BYTES = 6 * 1024 * 1024;

/** Forma mínima del archivo de multer (no usamos @types/multer, igual que el CV). */
export interface UploadedImageFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface ImageErrorCodes {
  invalidType: ErrorCode;
  tooLarge: ErrorCode;
}

type ImageExtension = 'jpg' | 'png' | 'webp';

/**
 * La extensión sale de los magic bytes, no del nombre del archivo: es lo que
 * decide el Content-Type con el que el static server servirá el archivo.
 */
function detectImageExtension(buffer: Buffer): ImageExtension | null {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return 'jpg';
  }
  if (
    buffer.length >= 8 &&
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'png';
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp';
  }
  return null;
}

export function requireValidImage(
  file: UploadedImageFile | undefined,
  codes: ImageErrorCodes,
): { file: UploadedImageFile; extension: ImageExtension } {
  if (!file || !file.buffer || file.buffer.length === 0) {
    throw new AppException(
      HttpStatus.BAD_REQUEST,
      codes.invalidType,
      'Selecciona una imagen JPG, PNG o WebP.',
    );
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new AppException(
      HttpStatus.BAD_REQUEST,
      codes.tooLarge,
      'La imagen no puede superar los 5 MB.',
    );
  }
  const extension = detectImageExtension(file.buffer);
  if (!extension) {
    throw new AppException(
      HttpStatus.BAD_REQUEST,
      codes.invalidType,
      'El archivo no es una imagen válida (JPG, PNG o WebP).',
    );
  }
  return { file, extension };
}

const STORAGE_KEY_PATTERN = /^[a-z0-9-]+\/[A-Za-z0-9-]+\.(png|jpe?g|webp|jpg)$/;

/**
 * Si la URL guardada apunta a un archivo subido por nosotros (`.../uploads/...`),
 * devuelve su clave para poder borrarlo al reemplazarlo. URLs externas → null.
 */
export function storageKeyFromUrl(
  url: string | null | undefined,
): string | null {
  if (!url) return null;
  const marker = '/uploads/';
  const index = url.indexOf(marker);
  if (index === -1) return null;
  const key = url.slice(index + marker.length);
  return STORAGE_KEY_PATTERN.test(key) ? key : null;
}
