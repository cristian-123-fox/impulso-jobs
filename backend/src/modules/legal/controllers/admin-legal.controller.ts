import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@/common/decorators/require-permissions.decorator';
import { RequireRoles } from '@/common/decorators/require-roles.decorator';
import { Role } from '@/common/types/role.enum';
import { JwtAuthGuard } from '@/modules/iam/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/modules/iam/permissions/guards/permissions.guard';
import { RolesGuard } from '@/modules/iam/permissions/guards/roles.guard';
import { ListConsentsQueryDto } from '@/modules/legal/dto/list-consents-query.dto';
import {
  ListConsentsResult,
  ListConsentsUseCase,
} from '@/modules/legal/use-cases/list-consents.use-case';

/**
 * Consulta del registro de consentimientos. **Sólo lectura.**
 *
 * Existe porque los documentos legales prometen que cada titular puede ver qué
 * aceptó, y porque un titular puede exigir que se le demuestre (art. 22
 * LFPDPPP). Eso obliga a que el registro sea consultable por alguien autorizado,
 * y no sólo por SQL.
 *
 * `Admin` por `RequireRoles` y `legal.consents.read` por permiso: son dos
 * barreras distintas a propósito. El rol dice quién puede entrar al back-office;
 * el permiso dice qué puede hacer dentro, y existe para que ese rol pueda
 * quitárselo a alguien sin sacarlo del panel.
 *
 * No hay ruta de escritura. La bitácora es *append-only* y el back-office no es
 * una excepción: ni el controller ni el use-case exponen forma de modificar o
 * borrar una fila.
 */
@ApiTags('admin-legal')
@ApiBearerAuth()
@Controller('admin/legal-consents')
@RequireRoles(Role.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class AdminLegalController {
  constructor(private readonly listConsents: ListConsentsUseCase) {}

  @Get()
  @RequirePermissions('legal.consents.read')
  @ApiOperation({
    summary:
      'Listado paginado y filtrable del registro de consentimientos, con el ' +
      'resumen de aceptaciones vigentes en el encabezado.',
  })
  list(@Query() query: ListConsentsQueryDto): Promise<ListConsentsResult> {
    return this.listConsents.execute(query);
  }
}
