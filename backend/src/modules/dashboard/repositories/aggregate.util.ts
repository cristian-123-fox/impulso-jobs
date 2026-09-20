/**
 * Normalización de lo que devuelven los agregados de SQL.
 *
 * ⚠️ **`COUNT`/`SUM` llegan como cadena en PostgreSQL** (`bigint` y `decimal`;
 * `pg` los entrega en texto para no perder precisión) y como número en MySQL.
 * Sin pasar por aquí, `a + b` acaba concatenando `"12"` y `"3"` en `"123"` sólo
 * en uno de los dos motores — el peor tipo de diferencia, la que no se ve en
 * desarrollo.
 */
export function toNumber(value: string | number | null | undefined): number {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * `YYYY-MM-DD` en hora local, que es como agrupó la base de datos. El driver de
 * PostgreSQL devuelve `Date` para un `CAST(... AS DATE)` y el de MySQL, texto.
 */
export function toDateKey(value: Date | string): string {
  if (typeof value === 'string') return value.slice(0, 10);
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}
