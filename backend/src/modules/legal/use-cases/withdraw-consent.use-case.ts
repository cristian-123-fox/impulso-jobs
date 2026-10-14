import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { WithdrawConsentDto } from '@/modules/legal/dto/record-consent.dto';
import { LegalConsentResponseDto } from '@/modules/legal/dto/legal.response.dto';
import { LegalConsent } from '@/modules/legal/entities/legal-consent.entity';
import {
  ConsentMethod,
  ConsentSource,
} from '@/modules/legal/enums/legal.enums';
import {
  LEGAL_DOCUMENT_REPOSITORY,
  type ILegalDocumentRepository,
} from '@/modules/legal/repositories/legal-document.repository.interface';
import {
  LEGAL_CONSENT_REPOSITORY,
  type ILegalConsentRepository,
} from '@/modules/legal/repositories/legal-consent.repository.interface';
import { LegalConsentMapper } from '@/modules/legal/use-cases/list-my-consents.use-case';

export interface WithdrawConsentCommand extends WithdrawConsentDto {
  userId: string;
  email?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

/**
 * Revocación del consentimiento (art. 7, párrafo sexto LFPDPPP: "podrá ser
 * revocado en cualquier momento sin que se le atribuyan efectos retroactivos").
 *
 * **No borra nada.** Inserta una fila con `granted = false`, que es la forma en
 * que la tabla representa una revocación. Consecuencia deliberada: la
 * aceptación original sigue siendo un hecho que ocurrió, y el estado actual se
 * deduce de la última fila de cada documento.
 *
 * Revocar los Términos o el Aviso no borra la cuenta ni anula un contrato en
 * curso: cierra la puerta a tratamientos futuros y deja constancia de por qué.
 * Para cancelar la cuenta de verdad está `DELETE /account` (derecho de
 * cancelación, art. 24), que es otra cosa.
 */
@Injectable()
export class WithdrawConsentUseCase {
  constructor(
    @Inject(LEGAL_CONSENT_REPOSITORY)
    private readonly consents: ILegalConsentRepository,
    @Inject(LEGAL_DOCUMENT_REPOSITORY)
    private readonly documents: ILegalDocumentRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(
    command: WithdrawConsentCommand,
  ): Promise<LegalConsentResponseDto> {
    const active = await this.consents.hasActiveConsent(
      command.userId,
      command.email ?? null,
      command.code,
    );

    if (!active) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.LEGAL_CONSENT_REQUIRED,
        'No hay un consentimiento vigente que revocar.',
      );
    }

    const catalog = await this.documents.listCurrent();
    const current = catalog.find((row) => row.code === command.code);

    const consent = new LegalConsent();
    consent.userId = command.userId;
    consent.subjectEmail = command.email ?? null;
    consent.documentCode = command.code;
    // Se anota contra la versión que seguía vigente: es la que el titular
    // estaba aceptando hasta hace un momento.
    consent.documentVersion = current?.version ?? 'desconocida';
    consent.documentHash = current?.contentHash ?? null;
    consent.granted = false;
    consent.consentMethod = ConsentMethod.EXPRESS_CHECKBOX;
    consent.source = ConsentSource.ACCOUNT_SETTINGS;
    consent.ip = command.ip ?? null;
    consent.userAgent = command.userAgent ?? null;
    consent.metadata = {
      documentCode: command.code,
      revocation: true,
      ...(command.reason ? { reason: command.reason } : {}),
    };

    await this.consents.create(consent);

    await this.audit.record({
      action: 'legal.consent.withdrawn',
      actorUserId: command.userId,
      entity: 'legal_consent',
      entityId: consent.id,
      ip: command.ip,
      userAgent: command.userAgent,
      metadata: {
        documentCode: command.code,
        documentVersion: consent.documentVersion,
        reason: command.reason ?? null,
      },
    });

    return LegalConsentMapper.toResponse(consent);
  }
}
