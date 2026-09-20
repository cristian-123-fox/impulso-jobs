/** Contrato de `GET /candidate/dashboard` (escrito a mano desde el Swagger). */

export interface CandidateKpis {
  totalApplications: number;
  /** Candidaturas que siguen vivas (estado no terminal). */
  activeApplications: number;
  newApplications: number;
  savedVacancies: number;
}

export interface CandidatePoint {
  date: string;
  count: number;
}

export interface CandidateStatusSlice {
  code: string;
  name: string;
  count: number;
  isFinal: boolean;
}

export interface CandidateProfileTask {
  key: string;
  label: string;
  route: string;
  done: boolean;
}

export interface CandidateProfileCompletion {
  percent: number;
  completed: number;
  total: number;
  tasks: CandidateProfileTask[];
}

export interface CandidateProfileViews {
  total: number;
  recent: number;
  lastViewedAt: string | null;
}

export interface CandidateDashboard {
  periodDays: number;
  firstName: string;
  kpis: CandidateKpis;
  applicationsTrend: CandidatePoint[];
  applicationsByStatus: CandidateStatusSlice[];
  profileCompletion: CandidateProfileCompletion;
  profileViews: CandidateProfileViews;
}
