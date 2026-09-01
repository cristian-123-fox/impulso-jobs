/**
 * Motivos de denuncia de una vacante. Catálogo cerrado: son los siete modos de
 * fallo reales de un portal de empleo; "piden dinero" y "no responden" sirven
 * además como señal de calidad del empleador.
 */
export enum VacancyReportReason {
  OFFENSIVE_DISCRIMINATORY = 'OFFENSIVE_DISCRIMINATORY',
  ADVERTISEMENT = 'ADVERTISEMENT',
  ASKS_FOR_MONEY = 'ASKS_FOR_MONEY',
  NO_RESPONSE = 'NO_RESPONSE',
  LOW_PAY = 'LOW_PAY',
  DUPLICATE = 'DUPLICATE',
  OTHER = 'OTHER',
}

export const VACANCY_REPORT_REASONS = Object.values(VacancyReportReason);

export enum VacancyReportStatus {
  PENDING = 'PENDING',
  RESOLVED = 'RESOLVED',
}
