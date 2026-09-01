/**
 * Utilidades para columnas `date` (sin hora), portables entre drivers: el de
 * MySQL las entrega como `Date` a medianoche local y el de PostgreSQL como
 * texto `YYYY-MM-DD`. Se toman las partes locales del `Date` para no correr el
 * día con la zona horaria del proceso.
 */

function formatLocal(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Normaliza el valor de una columna `date` a `YYYY-MM-DD` (o `null`). */
export function toDateOnly(value?: string | Date | null): string | null {
  if (value === null || value === undefined || value === '') return null;
  return typeof value === 'string' ? value.slice(0, 10) : formatLocal(value);
}

/** Fecha de hoy (hora local del proceso) como `YYYY-MM-DD`. */
export function todayAsDateOnly(): string {
  return formatLocal(new Date());
}
