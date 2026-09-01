/** Tipos de `GET/POST /candidate/applications`, derivados del Swagger. */

export interface ApplicationStatus {
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isFinal: boolean;
}

export interface ApplicationVacancy {
  id: string;
  title: string;
  employmentType: string;
  workMode: string;
  state: string;
  municipality: string;
  status: string;
  /** Nulo si la vacante es confidencial. */
  companyName: string | null;
  companyLogoUrl: string | null;
}

export interface CandidateApplication {
  id: string;
  status: ApplicationStatus | null;
  appliedAt: string;
  updatedAt: string;
  resumeId: string | null;
  vacancy: ApplicationVacancy | null;
}

export interface ApplicationAnswerPayload {
  questionId: string;
  optionId?: string;
  answerText?: string;
}

export interface CandidateApplicationsPage {
  items: CandidateApplication[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}
