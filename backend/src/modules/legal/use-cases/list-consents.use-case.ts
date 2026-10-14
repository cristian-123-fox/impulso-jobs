import { Inject, Injectable } from '@nestjs/common';
import {
  type PaginatedResponse,
  toPaginated,
} from '@/common/dto/paginated-response.dto';
import { AdminLegalConsentResponseDto } from '@/modules/legal/dto/legal.response.dto';
import { ListConsentsQueryDto } from '@/modules/legal/dto/list-consents-query.dto';
import {
  type ConsentSearchCriteria,
  type ConsentSummary,
  LEGAL_CONSENT_REPOSITORY,
  type ILegalConsentRepository,
} from '@/modules/legal/repositories/legal-consent.repository.interface';
import { LegalConsentMapper } from '@/modules/legal/use-cases/list-my-consents.use-case';

export interface ListConsentsResult extends PaginatedResponse<AdminLegalConsentResponseDto> {
  summary: ConsentSummary;
}

/**
 * Listado del back-office para comprobar qué aceptó cada persona y cuándo.
 *
 * Es la lectura que hace falta cuando un titular ejerce un derecho ARCO o cuando
 * la autoridad pide comprobar una aceptación concreta. Por eso devuelve el
 * `subjectEmail` y la IP junto a cada fila: sin ellos el registro no prueba nada,
 * porque una fila sin titular ni procedencia no se puede atribuir a nadie.
 *
 * Sólo lectura. Ni este use-case ni el repositorio tienen forma de modificar o
 * borrar una fila: la bitácora es append-only y el back-office no es la excepción.
 */
@Injectable()
export class ListConsentsUseCase {
  constructor(
    @Inject(LEGAL_CONSENT_REPOSITORY)
    private readonly consents: ILegalConsentRepository,
  ) {}

  async execute(query: ListConsentsQueryDto): Promise<ListConsentsResult> {
    const filters = {
      search: query.search,
      documentCode: query.documentCode,
      granted: query.granted,
      source: query.source,
    };

    const criteria: ConsentSearchCriteria = {
      ...filters,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    };

    // El resumen se calcula **sin** `page` ni `limit`, y no por descuido: si
    //los heredara, la cabecera mostraría una verdad distinta en cada página del
    // listado. El `Omit` del tipo del repositorio no hace nada en tiempo de
    // ejecución, así que la separación se hace aquí, constructing el objeto a
    // mano.
    const [[items, count], summary] = await Promise.all([
      this.consents.findAndCount(criteria),
      this.consents.summarize(filters),
    ]);

    return {
      ...toPaginated(
        items.map((row) => ({
          ...LegalConsentMapper.toResponse(row),
          hasSession: Boolean(row.userId),
        })),
        count,
        criteria.page,
        criteria.limit,
      ),
      summary,
    };
  }
}
