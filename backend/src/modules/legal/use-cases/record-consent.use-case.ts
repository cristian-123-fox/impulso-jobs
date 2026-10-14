import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { AuditService } from '@/modules/audit/audit.service';
import type { AcceptedDocumentDto } from '@/modules/legal/dto/record-consent.dto';
import { LegalConsent } from '@/modules/legal/entities/legal-consent.entity';
import {
  ConsentMethod,
  ConsentSource,
  LegalDocumentCode,
} from '@/modules/legal/enums/legal.enums';
import {
  LEGAL_DOCUMENT_REPOSITORY,
  type ILegalDocumentRepository,
} from '@/modules/legal/repositories/legal-document.repository.interface';
import {
  LEGAL_CONSENT_REPOSITORY,
  type ILegalConsentRepository,
} from '@/modules/legal/repositories/legal-consent.repository.interface';

export interface RecordConsentCommand {
  documents: AcceptedDocumentDto[];
  method: ConsentMethod;
  source: ConsentSource;
  /** Llega del token si hay sesión; `null` en los flujos públicos. */
  userId?: string | null;
  subjectEmail?: string | null;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
  /** Permite encadenar la escritura dentro de la transacción del llamador. */
  manager?: EntityManager;
}

const normalizeEmail = (value?: string | null): string | null => {
  const trimmed = value?.trim().toLowerCase();
  return trimmed ? trimmed : null;
};

/**
 * Deja constancia de lo que una persona aceptó, y de lo que rechazó.
 *
 * Tres reglas gobiernan este use-case, y las tres vienen de la ley:
 *
 * 1. **Sólo se acepta una versión que exista** (`legal_documents`). Si el front
 *    muestra una versión que la API no conoce, se rechaza. Es la única defensa
 *    contra un cliente retocado que invente una versión y una huella.
 * 2. **Lo que bloquea el servicio no se puede registrar como `false`.** Si un
 *    documento es `blocksRegistration` y llega `granted: false`, es un intento de
 *    alta sin aceptar y se rechaza con 400, no se guarda como "no aceptó".
 * 3. **Nada se sobrescribe.** Cada documento deja una fila; una revocación es
 *    otra fila con `granted = false`. Ver `LegalConsent`.
 *
 * La auditoría va detrás porque es lo que un titular puede pedir que se le
 * demuestre; si fallara, `AuditService` ya la silencia sin tumbar la operación.
 */
@Injectable()
export class RecordConsentUseCase {
  constructor(
    @Inject(LEGAL_CONSENT_REPOSITORY)
    private readonly consents: ILegalConsentRepository,
    @Inject(LEGAL_DOCUMENT_REPOSITORY)
    private readonly documents: ILegalDocumentRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(command: RecordConsentCommand): Promise<LegalConsent[]> {
    if (!command.documents || command.documents.length === 0) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.VALIDATION_ERROR,
        'No se recibió ningún documento.',
      );
    }

    const userId = command.userId ?? null;
    const subjectEmail = normalizeEmail(command.subjectEmail);

    if (!userId && !subjectEmail) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.VALIDATION_ERROR,
        'Sin sesión es necesario el correo del titular para dejar constancia.',
      );
    }

    const recorded: LegalConsent[] = [];

    for (const accepted of command.documents) {
      const catalog = await this.documents.findVersion(
        accepted.code,
        accepted.version,
        command.manager,
      );

      if (!catalog) {
        throw new AppException(
          HttpStatus.CONFLICT,
          ErrorCode.LEGAL_DOCUMENT_VERSION_UNKNOWN,
          `La versión ${accepted.code} ${accepted.version} no está registrada. ` +
            'Suele significar que el front y la API están desalineados.',
        );
      }

      if (!accepted.granted && catalog.blocksRegistration) {
        throw new AppException(
          HttpStatus.BAD_REQUEST,
          ErrorCode.LEGAL_CONSENT_REQUIRED,
          `No es posible continuar sin aceptar ${catalog.title}.`,
        );
      }

      const consent = new LegalConsent();
      consent.userId = userId;
      consent.subjectEmail = subjectEmail;
      consent.documentCode = catalog.code;
      consent.documentVersion = catalog.version;
      consent.documentHash =
        accepted.contentHash ?? catalog.contentHash ?? null;
      consent.granted = accepted.granted;
      consent.consentMethod = command.method;
      consent.source = command.source;
      consent.ip = command.ip ?? null;
      consent.userAgent = command.userAgent ?? null;
      consent.metadata = this.mergeMetadata(command.metadata, catalog.code);

      await this.consents.create(consent, command.manager);
      recorded.push(consent);

      await this.audit.record(
        {
          action: accepted.granted
            ? 'legal.consent.granted'
            : 'legal.consent.denied',
          actorUserId: userId,
          entity: 'legal_consent',
          entityId: consent.id,
          ip: command.ip,
          userAgent: command.userAgent,
          metadata: {
            documentCode: catalog.code,
            documentVersion: catalog.version,
            method: command.method,
            source: command.source,
          },
        },
        command.manager,
      );
    }

    return recorded;
  }

  /**
   * El código del documento se guarda siempre en `metadata`, aunque el cliente
   * mande algo: un mismo registro sirve después para reconstruir qué se aceptó
   * sin tener que depender de la forma del JSON que envió cada pantalla.
   */
  private mergeMetadata(
    metadata: Record<string, unknown> | null | undefined,
    code: LegalDocumentCode,
  ): Record<string, unknown> {
    return { ...(metadata ?? {}), documentCode: code };
  }
}
