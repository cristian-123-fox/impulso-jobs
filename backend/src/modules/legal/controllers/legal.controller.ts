import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ClientInfo,
  type ClientInfoPayload,
} from '@/common/decorators/client-info.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import type { AuthenticatedUser } from '@/common/types/authenticated-user';
import { JwtAuthGuard } from '@/modules/iam/auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '@/modules/iam/auth/guards/optional-jwt-auth.guard';
import {
  LegalConsentResponseDto,
  LegalDocumentResponseDto,
  RecordConsentResultDto,
} from '@/modules/legal/dto/legal.response.dto';
import {
  RecordConsentDto,
  WithdrawConsentDto,
} from '@/modules/legal/dto/record-consent.dto';
import { LegalDocumentCode } from '@/modules/legal/enums/legal.enums';
import { GetLegalDocumentsUseCase } from '@/modules/legal/use-cases/get-legal-documents.use-case';
import { ListMyConsentsUseCase } from '@/modules/legal/use-cases/list-my-consents.use-case';
import { LegalConsentMapper } from '@/modules/legal/use-cases/list-my-consents.use-case';
import { RecordConsentUseCase } from '@/modules/legal/use-cases/record-consent.use-case';
import { WithdrawConsentUseCase } from '@/modules/legal/use-cases/withdraw-consent.use-case';

/**
 * Documentos legales y registro de consentimiento.
 *
 * Las lecturas y `POST /consents` son públicas: el art. 16 de la LFPDPPP
 * obliga a que el aviso esté a disposición del titular, y los formularios de
 * contacto, el newsletter y el banner de cookies ocurren sin cuenta. Sólo
 * consultar el propio historial y revocar exigen sesión.
 */
@ApiTags('legal')
@Controller('legal')
export class LegalController {
  constructor(
    private readonly getDocuments: GetLegalDocumentsUseCase,
    private readonly recordConsent: RecordConsentUseCase,
    private readonly listMyConsents: ListMyConsentsUseCase,
    private readonly withdrawConsent: WithdrawConsentUseCase,
  ) {}

  @Get('documents')
  @ApiOperation({ summary: 'Versiones vigentes de los documentos legales.' })
  documents(): Promise<LegalDocumentResponseDto[]> {
    return this.getDocuments.current();
  }

  @Get('documents/:code/history')
  @ApiOperation({ summary: 'Historial de versiones de un documento.' })
  history(
    @Param('code', new ParseEnumPipe(LegalDocumentCode))
    code: LegalDocumentCode,
  ): Promise<LegalDocumentResponseDto[]> {
    return this.getDocuments.history(code);
  }

  @Post('consents')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(OptionalJwtAuthGuard)
  @ResponseMessage('Consentimiento registrado.')
  @ApiOperation({
    summary:
      'Registra qué documentos aceptó o rechazó una persona, con versión, ' +
      'fecha, IP y huella del texto mostrado. Admite sesión o sólo correo.',
  })
  async consents(
    @Body() dto: RecordConsentDto,
    @ClientInfo() client: ClientInfoPayload,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ): Promise<RecordConsentResultDto> {
    // La sesión manda sobre el `subjectEmail` del cuerpo: con token, la
    // constancia se imputa al titular de ese token y no a quien el cliente diga
    // que es. Sin sesión, el correo es lo único que permite imputarla después.
    const recorded = await this.recordConsent.execute({
      documents: dto.documents,
      method: dto.method,
      source: dto.source,
      userId: user?.userId ?? null,
      subjectEmail: user ? user.email : dto.subjectEmail,
      metadata: dto.metadata ?? null,
      ip: client.ip,
      userAgent: client.userAgent,
    });

    return {
      recorded: recorded.map((row) => LegalConsentMapper.toResponse(row)),
    };
  }

  @Get('consents')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Historial de consentimientos del titular (derecho de acceso).',
  })
  myConsents(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<LegalConsentResponseDto[]> {
    return this.listMyConsents.execute(user.userId, user.email);
  }

  @Post('consents/withdraw')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Consentimiento revocado.')
  @ApiOperation({
    summary:
      'Revoca un consentimiento vigente. No borra el registro anterior: ' +
      'inserta la revocación, que es lo que exige el art. 7 de la LFPDPPP.',
  })
  withdraw(
    @Body() dto: WithdrawConsentDto,
    @ClientInfo() client: ClientInfoPayload,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<LegalConsentResponseDto> {
    return this.withdrawConsent.execute({
      code: dto.code,
      reason: dto.reason,
      userId: user.userId,
      email: user.email,
      ip: client.ip,
      userAgent: client.userAgent,
    });
  }
}
