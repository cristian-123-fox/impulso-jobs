export interface CandidateResume {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  isDefault: boolean;
  createdAt: string;
}

export interface CandidateResumeDownload {
  blob: Blob;
  fileName: string;
}
