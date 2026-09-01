import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  ClientInfo,
  type ClientInfoPayload,
} from '@/common/decorators/client-info.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import type { AuthenticatedUser } from '@/common/types/authenticated-user';
import { JwtAuthGuard } from '@/modules/iam/auth/guards/jwt-auth.guard';
import {
  CreateVacancyReportDto,
  VacancyReportResponseDto,
} from '@/modules/vacancies/dto/vacancy-report.dto';
import { VacancyReportsUseCase } from '@/modules/vacancies/use-cases/vacancy-reports.use-case';

/**
 * Denunciar una vacante. Exige sesión (evita spam anónimo) pero no un permiso
 * de la matriz: el rol CANDIDATE se valida en el use-case, como en /auth/logout.
 */
@ApiTags('vacancy-reports')
@ApiBearerAuth()
@Controller('vacancies')
@UseGuards(JwtAuthGuard)
export class VacancyReportsController {
  constructor(private readonly reports: VacancyReportsUseCase) {}

  @Post(':id/report')
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage(
    'Denuncia registrada. Gracias por ayudarnos a cuidar el portal.',
  )
  report(
    @Param('id') id: string,
    @Body() dto: CreateVacancyReportDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<VacancyReportResponseDto> {
    return this.reports.report(id, dto, {
      userId: user.userId,
      role: user.role,
      ip: client.ip,
      userAgent: client.userAgent,
    });
  }
}
