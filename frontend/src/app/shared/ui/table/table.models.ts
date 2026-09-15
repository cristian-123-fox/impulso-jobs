import { TemplateRef } from '@angular/core';

/** Sentido de orden. Espeja `SortOrder` del backend. */
export type IjSortOrder = 'ASC' | 'DESC';

export interface IjSortState {
  /** Clave de columna; debe coincidir con la lista blanca del backend. */
  readonly column: string;
  readonly order: IjSortOrder;
}

/**
 * Definición de una columna. El **contenido** de la celda no se define aquí:
 * se pinta con un `<ng-template ijCell="<id>">` en el consumidor, para no
 * perder el marcado rico que ya tienen las tablas del back-office (avatares,
 * badges, botones de acción).
 */
export interface IjColumn<T> {
  /** Identificador estable. En orden de servidor viaja como `sortBy`. */
  readonly id: string;
  readonly header: string;
  /** `true` si la columna se puede ordenar. Por defecto, no. */
  readonly sortable?: boolean;
  /**
   * Valor por el que ordenar en modo cliente, y contenido por defecto de la
   * celda si no hay plantilla. En modo servidor sólo se usa como respaldo.
   */
  readonly value?: (row: T) => string | number | null | undefined;
  /** Clases extra para la celda y su cabecera (alineación, ancho). */
  readonly class?: string;
  /** Oculta la columna por debajo de este breakpoint de Tailwind. */
  readonly hideBelow?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface IjCellContext<T> {
  readonly $implicit: T;
  readonly row: T;
  readonly index: number;
}

export type IjCellTemplate<T> = TemplateRef<IjCellContext<T>>;
