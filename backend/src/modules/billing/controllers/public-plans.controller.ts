import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { PlanResponseDto } from '@/modules/billing/dto/billing-response.dto';
import { PlanCatalogUseCase } from '@/modules/billing/use-cases/plan-catalog.use-case';

/**
 * Catálogo público de planes: precio con IVA, métodos de pago admitidos y la
 * matriz completa de beneficios. Es lo que pinta la pantalla de precios.
 *
 * Sin guard, como el listado público de vacantes: cualquiera puede ver qué se
 * vende. Sólo aparecen los planes activos.
 */
@ApiTags('plans')
@Controller('plans')
export class PublicPlansController {
  constructor(private readonly catalog: PlanCatalogUseCase) {}

  @Get()
  @ResponseMessage('Planes obtenidos.')
  list(): Promise<PlanResponseDto[]> {
    return this.catalog.list(true);
  }
}
