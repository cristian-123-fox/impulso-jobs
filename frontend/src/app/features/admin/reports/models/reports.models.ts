/** Denuncia de vacante, vista del back-office (`/admin/vacancy-reports`). */
export interface VacancyReport {
  id: string;
  vacancyId: string;
  vacancyTitle: string | null;
  companyName: string | null;
  reasonCode: string;
  comment: string | null;
  status: 'PENDING' | 'RESOLVED' | string;
  createdAt: string;
  resolvedAt: string | null;
}

export interface VacancyReportsPage {
  items: VacancyReport[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export const REPORT_REASON_LABELS: Record<string, string> = {
  OFFENSIVE_DISCRIMINATORY: 'Ofensiva / discriminatoria',
  ADVERTISEMENT: 'Es un anuncio',
  ASKS_FOR_MONEY: 'Solicitan dinero',
  NO_RESPONSE: 'No responden',
  LOW_PAY: 'Pagan muy poco',
  DUPLICATE: 'Duplicada',
  OTHER: 'Otro motivo',
};

export const REPORT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  RESOLVED: 'Resuelta',
};
