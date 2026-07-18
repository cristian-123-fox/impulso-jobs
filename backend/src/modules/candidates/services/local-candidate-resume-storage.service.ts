import { createReadStream, promises as fs } from 'node:fs';
import { Injectable } from '@nestjs/common';
import { dirname, join, resolve } from 'node:path';
import {
  ICandidateResumeStorage,
  SaveCandidateResumeFile,
} from '@/modules/candidates/services/candidate-resume-storage.port';

@Injectable()
export class LocalCandidateResumeStorageService implements ICandidateResumeStorage {
  private readonly baseDir = resolve(
    process.cwd(),
    'uploads',
    'candidate-resumes',
  );

  async save(file: SaveCandidateResumeFile): Promise<{ storageKey: string }> {
    const storageKey = join(file.profileId, `${file.resumeId}.pdf`).replace(
      /\\/g,
      '/',
    );
    const fullPath = this.resolvePath(storageKey);

    await fs.mkdir(dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, file.buffer);

    return { storageKey };
  }

  async delete(storageKey: string): Promise<void> {
    await fs.unlink(this.resolvePath(storageKey));
  }

  async openReadStream(storageKey: string) {
    const fullPath = this.resolvePath(storageKey);
    await fs.access(fullPath);
    return createReadStream(fullPath);
  }

  private resolvePath(storageKey: string): string {
    return resolve(this.baseDir, storageKey);
  }
}
