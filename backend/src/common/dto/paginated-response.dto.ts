/**
 * Forma común de los listados paginados. Viaja dentro de `content` del envelope
 * de respuesta, de modo que el front lea siempre `content.items` / `content.total`.
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  /** Número total de páginas (mínimo 1 aunque no haya resultados). */
  pages: number;
}

export function toPaginated<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResponse<T> {
  return {
    items,
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}
