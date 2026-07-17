import { CandidateResume } from '@/modules/candidates/entities/candidate-resume.entity';

export interface CandidateResumeResponseDto {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  isDefault: boolean;
  createdAt: string;
}

export function toCandidateResumeResponse(
  resume: CandidateResume,
): CandidateResumeResponseDto {
  return {
    id: resume.id,
    fileName: resume.fileName,
    fileUrl: resume.fileUrl,
    fileSize: resume.fileSize,
    mimeType: resume.mimeType,
    isDefault: resume.isDefault,
    createdAt: resume.createdAt.toISOString(),
  };
}
