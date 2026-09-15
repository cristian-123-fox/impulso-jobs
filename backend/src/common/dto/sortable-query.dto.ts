import { Transform } from 'class-transformer';
import { IsIn, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';

export const SORT_ORDERS = ['ASC', 'DESC'] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

/**
 * Base de los listados que se pueden ordenar por columna. `sortOrder` vive
 * aquí porque es idéntico en todos; **`sortBy` lo declara cada DTO** con su
 * propia lista blanca, porque las columnas ordenables dependen del listado.
 *
 * La lista blanca no es una validación de cortesía: es lo que impide que un
 * valor de la query string acabe en la cláusula ORDER BY. Ver `buildOrder`.
 */
export class SortableQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: SORT_ORDERS })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  @IsIn(SORT_ORDERS, { message: 'El sentido de orden no es válido.' })
  sortOrder?: SortOrder;
}
