import { ReadStream } from 'node:fs';

export const CANDIDATE_RESUME_STORAGE = 'CANDIDATE_RESUME_STORAGE';

export interface SaveCandidateResumeFile {
  profileId: string;
  resumeId: string;
  buffer: Buffer;
}

export interface ICandidateResumeStorage {
  save(file: SaveCandidateResumeFile): Promise<{ storageKey: string }>;
  delete(storageKey: string): Promise<void>;
  openReadStream(storageKey: string): Promise<ReadStream>;
}
