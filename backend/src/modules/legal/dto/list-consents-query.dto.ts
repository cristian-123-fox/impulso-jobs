import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { SortableQueryDto } from '@/common/dto/sortable-query.dto';
import { LegalDocumentCode } from '@/modules/legal/enums/legal.enums';
import {
  CONSENT_SORT_KEYS,
  type ConsentSortKey,
} from '@/modules/legal/repositories/legal-consent.repository.interface';

/**
 * Filtros del listado administrativo de consentimientos.
 *
 * `granted` llega como texto desde la query string (`?granted=false`), igual que
 * en `ListUsersQueryDto`; el `Transform` lo convierte y lo descarta si no es un
 * booleano reconocible, para que un valor raro no se convierta en un filtro
 * que no significa nada.
 */
export class ListConsentsQueryDto extends SortableQueryDto {
  @ApiPropertyOptional({ description: 'Correo del titular (parcial).' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @ApiPropertyOptional({ enum: LegalDocumentCode })
  @IsOptional()
  @IsEnum(LegalDocumentCode, { message: 'El documento no es válido.' })
  documentCode?: LegalDocumentCode;

  @ApiPropertyOptional({
    description: 'true sólo aceptaciones; false sólo negativas y revocaciones.',
    type: Boolean,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  granted?: boolean;

  @ApiPropertyOptional({ description: 'Origen de la aceptación.' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  source?: string;

  @ApiPropertyOptional({ enum: CONSENT_SORT_KEYS })
  @IsOptional()
  @IsIn(CONSENT_SORT_KEYS, { message: 'La columna de orden no es válida.' })
  sortBy?: ConsentSortKey;
}
