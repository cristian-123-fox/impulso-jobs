export const NOTIFY_VACANCY_CLOSED_PORT = 'NOTIFY_VACANCY_CLOSED_PORT';

export interface INotifyVacancyClosedPort {
  execute(vacancyId: string, vacancyTitle: string): Promise<void>;
}
