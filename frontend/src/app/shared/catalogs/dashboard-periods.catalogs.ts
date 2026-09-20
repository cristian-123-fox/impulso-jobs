/**
 * Ventanas de tiempo de los paneles de inicio.
 *
 * Lista cerrada y compartida por las tres áreas: el backend valida contra
 * estos mismos tres valores (`DashboardQueryDto`), así que añadir uno aquí sin
 * añadirlo allí produce un 400 al pulsar el botón.
 */
export interface DashboardPeriod {
  readonly days: number;
  readonly label: string;
}

export const DASHBOARD_PERIODS: readonly DashboardPeriod[] = [
  { days: 7, label: '7 días' },
  { days: 30, label: '30 días' },
  { days: 90, label: '90 días' },
];
