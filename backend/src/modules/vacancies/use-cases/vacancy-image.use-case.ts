import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
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
  type IVacancyRepository,
  VACANCY_REPOSITORY,
} from '@/modules/vacancies/repositories/vacancy.repository.interface';
import { VacancyOwnershipService } from '@/modules/vacancies/services/vacancy-ownership.service';

export interface VacancyImageActor {
  userId: string;
  ip: string;
  userAgent: string;
}

@Injectable()
export class VacancyImageUseCase {
  constructor(
    @Inject(VACANCY_REPOSITORY)
    private readonly vacancies: IVacancyRepository,
    private readonly ownership: VacancyOwnershipService,
    @Inject(PUBLIC_FILE_STORAGE)
    private readonly storage: PublicFileStoragePort,
    private readonly audit: AuditService,
  ) {}

  async uploadImage(
    vacancyId: string,
    file: UploadedImageFile | undefined,
    actor: VacancyImageActor,
  ): Promise<string | null> {
    const company = await this.ownership.requireCompany(actor.userId);
    const vacancy = await this.ownership.requireOwnVacancy(vacancyId, company.id);
    const { file: validFile, extension } = requireValidImage(file, {
      invalidType: ErrorCode.VACANCY_IMAGE_INVALID_TYPE,
      tooLarge: ErrorCode.VACANCY_IMAGE_TOO_LARGE,
    });

    const key = `vacancy-images/${randomUUID()}.${extension}`;
    await this.storage.save({ key, buffer: validFile.buffer });

    const previousUrl = vacancy.imageUrl;
    vacancy.imageUrl = this.storage.publicUrl(key);
    const saved = await this.vacancies.save(vacancy);
    await this.deleteReplacedFile(previousUrl, saved.imageUrl);

    await this.audit.record({
      action: 'vacancies.image.upload',
      actorUserId: actor.userId,
      entity: 'vacancy',
      entityId: saved.id,
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    return saved.imageUrl ?? null;
  }

  async deleteImage(
    vacancyId: string,
    actor: VacancyImageActor,
  ): Promise<void> {
    const company = await this.ownership.requireCompany(actor.userId);
    const vacancy = await this.ownership.requireOwnVacancy(vacancyId, company.id);

    if (!vacancy.imageUrl) return;

    const previousUrl = vacancy.imageUrl;
    vacancy.imageUrl = null;
    const saved = await this.vacancies.save(vacancy);
    await this.deleteReplacedFile(previousUrl, saved.imageUrl);

    await this.audit.record({
      action: 'vacancies.image.delete',
      actorUserId: actor.userId,
      entity: 'vacancy',
      entityId: saved.id,
      ip: actor.ip,
      userAgent: actor.userAgent,
    });
  }

  private async deleteReplacedFile(
    previousUrl: string | null | undefined,
    currentUrl: string | null | undefined,
  ): Promise<void> {
    const previousKey = storageKeyFromUrl(previousUrl);
    if (previousKey && previousUrl !== currentUrl) {
      await this.storage.delete(previousKey).catch(() => undefined);
    }
  }
}
