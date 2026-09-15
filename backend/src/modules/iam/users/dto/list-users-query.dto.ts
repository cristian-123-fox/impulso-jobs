import { Transform } from 'class-transformer';
import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SortableQueryDto } from '@/common/dto/sortable-query.dto';
import { Role } from '@/common/types/role.enum';
import { UserStatus } from '@/common/types/user-status.enum';

/**
 * Columnas por las que se puede ordenar el listado, y la propiedad de la
 * entidad a la que corresponde cada una. Es una lista blanca: lo que no está
 * aquí no llega al ORDER BY (ver `buildOrder`).
 */
export const USER_SORT_COLUMNS = {
  email: 'email',
  role: 'role',
  status: 'status',
  createdAt: 'createdAt',
  lastLogin: 'lastLogin',
} as const;

export const USER_SORT_KEYS = Object.keys(
  USER_SORT_COLUMNS,
) as (keyof typeof USER_SORT_COLUMNS)[];

export type UserSortKey = keyof typeof USER_SORT_COLUMNS;

/** Filtros del listado administrativo de usuarios. */
export class ListUsersQueryDto extends SortableQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @IsOptional()
  @IsEnum(Role, { message: 'El rol no es válido.' })
  role?: Role;

  @IsOptional()
  @IsEnum(UserStatus, { message: 'El estado no es válido.' })
  status?: UserStatus;

  /** `true`/`false` como texto en la query string. */
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  emailVerified?: boolean;

  /**
   * `true` lista **sólo** las cuentas dadas de baja. Sin este filtro quedan
   * fuera, así que es la única forma de encontrarlas para restaurarlas (M13).
   */
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  deleted?: boolean;

  @ApiPropertyOptional({ enum: USER_SORT_KEYS })
  @IsOptional()
  @IsIn(USER_SORT_KEYS, { message: 'La columna de orden no es válida.' })
  sortBy?: UserSortKey;
}
