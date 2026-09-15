import { Directive, TemplateRef, inject, input } from '@angular/core';
import { IjCellContext } from '@/shared/ui/table/table.models';

/**
 * Marca la plantilla de una celda y la asocia al `id` de su columna:
 *
 *   <ng-template ijCell="email" [ijCellOf]="users()" let-user>
 *     {{ user.email }}
 *   </ng-template>
 *
 * Es lo que permite que `ij-table` se encargue de la estructura (cabecera
 * ordenable, selección, estados) sin imponer nada sobre el contenido.
 *
 * `ijCellOf` **no se usa en tiempo de ejecución**: existe para que Angular
 * infiera el tipo de la fila y `let-user` no caiga a `unknown`. Sin él se
 * perdería el chequeo de tipos en la plantilla, que es justo lo que se gana
 * al escribir las celdas en el consumidor.
 */
@Directive({
  selector: 'ng-template[ijCell]',
})
export class IjCell<T> {
  /** Id de la columna a la que pertenece esta plantilla. */
  readonly ijCell = input.required<string>();

  /** Ancla de tipo. Pásale la misma colección que va en `[data]`. */
  readonly ijCellOf = input<readonly T[]>([]);

  readonly template: TemplateRef<IjCellContext<T>> =
    inject<TemplateRef<IjCellContext<T>>>(TemplateRef);

  /** Da tipo al `let-` de la plantilla (`$implicit` es la fila). */
  static ngTemplateContextGuard<T>(
    _dir: IjCell<T>,
    _ctx: unknown,
  ): _ctx is IjCellContext<T> {
    return true;
  }
}
