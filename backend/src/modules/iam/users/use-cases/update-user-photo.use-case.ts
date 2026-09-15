import { randomUUID } from 'node:crypto';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import {
  requireValidImage,
  storageKeyFromUrl,
  type UploadedImageFile,
} from '@/common/storage/image-upload';
import {
  PUBLIC_FILE_STORAGE,
  type PublicFileStoragePort,
} from '@/common/storage/public-file-storage.port';
import { ErrorCode } from '@/common/types/error-code.enum';
import { AuditService } from '@/modules/audit/audit.service';
import {
  type IUserRepository,
  USER_REPOSITORY,
} from '@/modules/iam/users/repositories/user.repository.interface';

export interface UserPhotoActor {
  actorUserId: string;
  ip: string;
  userAgent: string;
}

/**
 * Foto de la cuenta, gestionada desde el back-office. Mismo patrón que el
 * logo de empresa y la foto del candidato: la imagen se valida por sus magic
 * bytes, se guarda con un nombre nuevo y sólo entonces se borra la anterior.
 *
 * La URL se persiste **absoluta** (T23), así que depende de `APP_PUBLIC_URL`;
 * si cambia el host, `pnpm uploads:rehost` reescribe también esta columna.
 */
@Injectable()
export class UpdateUserPhotoUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(PUBLIC_FILE_STORAGE)
    private readonly storage: PublicFileStoragePort,
    private readonly audit: AuditService,
  ) {}

  async upload(
    userId: string,
    file: UploadedImageFile | undefined,
    actor: UserPhotoActor,
  ): Promise<string | null> {
    const user = await this.requireUser(userId);
    const { file: validFile, extension } = requireValidImage(file, {
      invalidType: ErrorCode.USER_PHOTO_INVALID_TYPE,
      tooLarge: ErrorCode.USER_PHOTO_TOO_LARGE,
    });

    const key = `user-photos/${randomUUID()}.${extension}`;
    await this.storage.save({ key, buffer: validFile.buffer });

    const previousUrl = user.photoUrl;
    user.photoUrl = this.storage.publicUrl(key);
    const saved = await this.users.save(user);
    await this.deleteReplacedFile(previousUrl, saved.photoUrl);

    await this.audit.record({
      action: 'users.photo.upload',
      actorUserId: actor.actorUserId,
      entity: 'user',
      entityId: saved.id,
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    return saved.photoUrl ?? null;
  }

  async remove(userId: string, actor: UserPhotoActor): Promise<void> {
    const user = await this.requireUser(userId);
    const previousUrl = user.photoUrl;
    if (!previousUrl) return;

    user.photoUrl = null;
    await this.users.save(user);
    await this.deleteReplacedFile(previousUrl, null);

    await this.audit.record({
      action: 'users.photo.delete',
      actorUserId: actor.actorUserId,
      entity: 'user',
      entityId: userId,
      ip: actor.ip,
      userAgent: actor.userAgent,
    });
  }

  private async requireUser(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.USER_NOT_FOUND,
        'El usuario no existe.',
      );
    }
    return user;
  }

  /**
   * Borra el archivo sustituido. Es best-effort: si falla, queda un huérfano
   * en disco pero la cuenta ya apunta a la foto nueva — al revés sí sería un
   * problema (una fila apuntando a un archivo que ya no está).
   */
  private async deleteReplacedFile(
    previousUrl: string | null | undefined,
    nextUrl: string | null | undefined,
  ): Promise<void> {
    if (!previousUrl || previousUrl === nextUrl) return;
    const key = storageKeyFromUrl(previousUrl);
    if (!key) return;
    await this.storage.delete(key).catch(() => undefined);
  }
}
