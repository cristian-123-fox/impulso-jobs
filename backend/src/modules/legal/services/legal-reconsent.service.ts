import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import type { RegisterLegalDto } from '@/modules/iam/registration/dto/register.dto';
import { LegalDocument } from '@/modules/legal/entities/legal-document.entity';
import {
  ConsentMethod,
  ConsentSource,
} from '@/modules/legal/enums/legal.enums';
import {
  LEGAL_CONSENT_REPOSITORY,
  type ILegalConsentRepository,
} from '@/modules/legal/repositories/legal-consent.repository.interface';
import {
  LEGAL_DOCUMENT_REPOSITORY,
  type ILegalDocumentRepository,
} from '@/modules/legal/repositories/legal-document.repository.interface';
import { RecordConsentUseCase } from '@/modules/legal/use-cases/record-consent.use-case';

/**
 * Re-consentimiento por cambio de versión de los documentos obligatorios.
 *
 * ## El hueco que cubre
 *
 * El alta exigía aceptar Términos y Aviso en su versión vigente, pero después de
 * eso nadie volvía a mirar qué versión había aceptado cada persona. Al publicar
 * unos documentos nuevos, las cuentas existentes seguían entrando con un
 * consentimiento anclado a un texto que ya nadie tenía delante.
 *
 * El art. 7 de la LFPDPPP pide que el consentimiento sea informado y que conste
 * sobre un aviso concreto; el art. 16 obliga a mantener el aviso a disposición.
 * Aceptar la v1.0 y que la v1.1 entre en vigor sin volver a preguntarlo deja el
 * contrato apoyado en un documento que el titular no ha visto.
 *
 * ## Por qué no se guarda «la versión aceptada» en el usuario
 *
 * Porque `legal_consents` ya es ese registro, y es append-only: añadir una
 * columna que se sobrescriba en cada cambio de versión rompería la única fuente
 * que la ley manda conservar. La versión vigente de una persona se deriva de su
 * última fila, igual que la revocación se deriva de su última fila.
 *
 * ## Cuándo se dispara
 *
 * Sólo al iniciar sesión, y sólo si hay un documento con `blocksRegistration` en
 * una versión que la persona no aceptó. Cambiar la redacción de un documento
 * accesorio —cookies, reembolso— no bloquea a nadie: `blocksRegistration` es lo
 * que separa lo que impide usar el servicio de lo que no.
 */
export interface ReconsentCommand {
  userId: string;
  email: string;
  /** Lo que el formulario envió. `undefined` en un login normal al día. */
  legal?: RegisterLegalDto | undefined;
  ip: string;
  userAgent: string;
  /** Encadena la escritura en la transacción del llamador, si la hay. */
  manager?: EntityManager;
}

/**
 * Por qué hay que volver a consentir. La diferencia importa porque el aviso
 * que ve la persona es distinto en los dos casos, y decir «actualizamos» a
 * alguien que nunca aceptó sería mentirle: no se actualizó nada, sencillamente
 * no le constaba.
 */
export interface OutdatedResult {
  /** Documentos bloqueantes cuya versión vigente no está aceptada. */
  readonly documents: readonly LegalDocument[];
  /** Sin ninguna fila: la cuenta es anterior al registro de consentimiento. */
  readonly neverAccepted: readonly LegalDocument[];
  /** Con fila de una versión anterior: aquí sí hubo un cambio de texto. */
  readonly versionChanged: readonly LegalDocument[];
}

@Injectable()
export class LegalReconsentService {
  constructor(
    @Inject(LEGAL_CONSENT_REPOSITORY)
    private readonly consents: ILegalConsentRepository,
    @Inject(LEGAL_DOCUMENT_REPOSITORY)
    private readonly documents: ILegalDocumentRepository,
    private readonly record: RecordConsentUseCase,
  ) {}

  /**
   * Documentos obligatorios cuya versión vigente no está aceptada por el
   * titular. Vacío significa «puede entrar sin hacer nada».
   *
   * Separa los dos motivos porque el mensaje al usuario es distinto y porque la
   * causa técnica de uno es normal (cuentas creadas antes de que existiera el
   * registro) y la del otro no (un cambio de versión sin avisar).
   */
  async outdated(userId: string, email: string): Promise<OutdatedResult> {
    const current = await this.documents.listCurrent();
    const required = current.filter((doc) => doc.blocksRegistration);

    const empty: OutdatedResult = {
      documents: [],
      neverAccepted: [],
      versionChanged: [],
    };
    if (required.length === 0) return empty;

    const latest = await this.consents.findLatestByCodes(
      userId,
      email,
      required.map((doc) => doc.code),
    );

    const byCode = new Map(latest.map((row) => [row.documentCode, row]));

    const neverAccepted: LegalDocument[] = [];
    const versionChanged: LegalDocument[] = [];

    for (const doc of required) {
      const decision = byCode.get(doc.code);
      // Sin fila no hay aceptación: o nunca aceptó, o se borró el historial,
      // y en los dos casos hay que preguntarlo.
      if (!decision) {
        neverAccepted.push(doc);
        continue;
      }
      if (decision.granted !== true) {
        neverAccepted.push(doc);
        continue;
      }
      if (decision.documentVersion !== doc.version) versionChanged.push(doc);
    }

    return {
      documents: [...neverAccepted, ...versionChanged],
      neverAccepted,
      versionChanged,
    };
  }

  /**
   * Puerta de entrada. Si no hay nada desactualizado, no toca nada y no
   * escribe: el login del 99 % de las veces no debe generar una fila.
   *
   * Cuando sí lo hay, exige aceptación explícita de la versión vigente. Se
   * apoya en `RecordConsentUseCase`, que ya valida que la versión exista en el
   * catálogo, así que el login no puede aceptar una versión inventada por un
   * cliente retocado.
   */
  async requireCurrentVersions(command: ReconsentCommand): Promise<void> {
    const { documents: outdated, neverAccepted } = await this.outdated(
      command.userId,
      command.email,
    );

    if (outdated.length === 0) return;

    // Se exige el código **y** la versión vigente: aceptar el código sin la
    // versión es justo lo que hay que evitar, porque dejaría constancia de un
    // consentimiento sobre un texto que el titular no vio.
    const granted = new Map(
      (command.legal?.documents ?? [])
        .filter((doc) => doc.granted)
        .map((doc) => [doc.code, doc.version]),
    );

    const pending = outdated.filter(
      (doc) => granted.get(doc.code) !== doc.version,
    );

    if (pending.length > 0) {
      throw this.buildException(pending, neverAccepted.length > 0);
    }

    // Se registran todos los desactualizados, no sólo los que venían sin
    // marcar: para el titular todos son nuevos, y es la fila que deja constancia
    // de que acepta este texto y no el anterior.
    await this.record.execute({
      documents: outdated.map((doc) => ({
        code: doc.code,
        version: doc.version,
        granted: true,
      })),
      method: ConsentMethod.EXPRESS_CHECKBOX,
      source: ConsentSource.LOGIN,
      userId: command.userId,
      subjectEmail: command.email,
      ip: command.ip,
      userAgent: command.userAgent,
      manager: command.manager,
    });
  }

  /**
   * Elige el código de error y el texto según el motivo.
   *
   * `LEGAL_CONSENT_REQUIRED` para quien nunca aceptó —la cuenta es anterior al
   * registro— y `LEGAL_VERSION_OUTDATED` para el cambio real de versión. El
   * cliente distingue los dos para no anunciarle a alguien una actualización que
   * no ha ocurrido.
   */
  private buildException(
    pending: LegalDocument[],
    never: boolean,
  ): AppException {
    const detail = pending
      .map(
        (doc) =>
          `${doc.title} (${doc.version}, vigente desde el ${doc.effectiveDate})`,
      )
      .join('; ');

    if (never) {
      return new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.LEGAL_CONSENT_REQUIRED,
        `Antes de entrar tienes que aceptar ${detail}. Los aceptas una sola vez.`,
      );
    }

    return new AppException(
      HttpStatus.CONFLICT,
      ErrorCode.LEGAL_VERSION_OUTDATED,
      `Actualizamos ${detail}. Revísalo y acepta la versión vigente para continuar.`,
    );
  }
}
