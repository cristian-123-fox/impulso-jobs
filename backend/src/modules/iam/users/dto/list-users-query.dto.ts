import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { Role } from '@/common/types/role.enum';
import { UserStatus } from '@/common/types/user-status.enum';

/** Filtros del listado administrativo de usuarios. */
export class ListUsersQueryDto extends PaginationQueryDto {
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
}
