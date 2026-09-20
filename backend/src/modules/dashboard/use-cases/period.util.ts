export const DAY_MS = 24 * 60 * 60 * 1000;

export interface DailyPoint {
  date: string;
  count: number;
}

export function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Primer instante del rango que cubre `days` días contando hoy. */
export function periodStart(now: Date, days: number): Date {
  return startOfDay(new Date(now.getTime() - (days - 1) * DAY_MS));
}

export function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Los días del rango, en orden, para rellenar series sin huecos. */
export function eachDay(from: Date, to: Date): string[] {
  const days: string[] = [];
  const cursor = startOfDay(from);
  const last = startOfDay(to);
  while (cursor.getTime() <= last.getTime()) {
    days.push(dateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

/**
 * Un punto por día del rango, con 0 donde no hubo nada.
 *
 * No es cosmética: una gráfica de líneas que salta del día 3 al 9 une los dos
 * puntos con una recta, y esa recta afirma que hubo actividad intermedia que
 * nunca existió.
 */
export function fillDailyGaps(
  rows: readonly DailyPoint[],
  from: Date,
  to: Date,
): DailyPoint[] {
  const counts = new Map(rows.map((row) => [row.date, row.count]));
  return eachDay(from, to).map((date) => ({
    date,
    count: counts.get(date) ?? 0,
  }));
}

/** Días completos entre dos fechas; negativo si `target` ya pasó. */
export function daysUntil(target: Date, now: Date): number {
  return Math.ceil((target.getTime() - now.getTime()) / DAY_MS);
}
