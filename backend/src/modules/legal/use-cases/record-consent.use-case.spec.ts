import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '@/common/types/error-code.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { LegalDocument } from '@/modules/legal/entities/legal-document.entity';
import {
  ConsentMethod,
  ConsentSource,
  LegalDocumentCode,
} from '@/modules/legal/enums/legal.enums';
import { ILegalConsentRepository } from '@/modules/legal/repositories/legal-consent.repository.interface';
import { ILegalDocumentRepository } from '@/modules/legal/repositories/legal-document.repository.interface';
import {
  RecordConsentCommand,
  RecordConsentUseCase,
} from '@/modules/legal/use-cases/record-consent.use-case';

function documentOf(
  code: LegalDocumentCode,
  overrides: Partial<LegalDocument> = {},
): LegalDocument {
  return Object.assign(new LegalDocument(), {
    id: `doc-${code}`,
    code,
    version: '1.0.0',
    locale: 'es',
    title: code,
    effectiveDate: '2026-10-01',
    contentHash: null,
    isCurrent: true,
    blocksRegistration: true,
    ...overrides,
  });
}

describe('RecordConsentUseCase', () => {
  let consents: jest.Mocked<ILegalConsentRepository>;
  let documents: jest.Mocked<ILegalDocumentRepository>;
  let audit: jest.Mocked<AuditService>;
  let useCase: RecordConsentUseCase;

  const command = (
    overrides: Partial<RecordConsentCommand> = {},
  ): RecordConsentCommand => ({
    documents: [
      { code: LegalDocumentCode.TERMS, version: '1.0.0', granted: true },
    ],
    method: ConsentMethod.EXPRESS_WRITTEN,
    source: ConsentSource.REGISTRATION,
    userId: 'user-1',
    subjectEmail: 'ana@test.io',
    ip: '203.0.113.9',
    userAgent: 'jest',
    ...overrides,
  });

  beforeEach(() => {
    let seq = 0;
    consents = {
      create: jest.fn((row) => {
        seq += 1;
        Object.assign(row, { id: `consent-${seq}`, createdAt: new Date() });
        return Promise.resolve();
      }),
      listBySubject: jest.fn().mockResolvedValue([]),
      hasActiveConsent: jest.fn().mockResolvedValue(false),
      // El listado del back-office no lo usa este use-case, pero el tipo de la
      // interfaz es completo: si no, el mock no sería asignable.
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      summarize: jest.fn().mockResolvedValue({
        total: 0,
        granted: 0,
        denied: 0,
        activeTerms: 0,
        activePrivacy: 0,
        activeImageRights: 0,
      }),
    };
    documents = {
      listCurrent: jest.fn().mockResolvedValue([]),
      findVersion: jest
        .fn()
        .mockImplementation((code: LegalDocumentCode) =>
          Promise.resolve(documentOf(code)),
        ),
      listHistory: jest.fn().mockResolvedValue([]),
    };
    audit = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;

    useCase = new RecordConsentUseCase(consents, documents, audit);
  });

  it('registra una aceptación con versión, IP y método', async () => {
    const recorded = await useCase.execute(command());

    expect(recorded).toHaveLength(1);
    expect(consents.create).toHaveBeenCalledTimes(1);
    expect(consents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        documentCode: LegalDocumentCode.TERMS,
        documentVersion: '1.0.0',
        granted: true,
        consentMethod: ConsentMethod.EXPRESS_WRITTEN,
        source: ConsentSource.REGISTRATION,
        ip: '203.0.113.9',
      }),
      undefined,
    );
  });

  it('rechaza una versión que el catálogo no conoce', async () => {
    documents.findVersion.mockResolvedValue(null);

    await expect(useCase.execute(command())).rejects.toMatchObject({
      status: HttpStatus.CONFLICT,
    });
    expect(consents.create).not.toHaveBeenCalled();
  });

  it('no acepta un documento bloqueante marcado como `granted: false`', async () => {
    // Es el intento de alta sin consentimiento: tiene que ser un 400, no una
    // fila con `granted: false` (art. 7 LFPDPPP: el tratamiento está sujeto al
    // consentimiento, y para el contrato no cabe el tácito).
    await expect(
      useCase.execute(
        command({
          documents: [
            {
              code: LegalDocumentCode.TERMS,
              version: '1.0.0',
              granted: false,
            },
          ],
        }),
      ),
    ).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
    expect(consents.create).not.toHaveBeenCalled();
  });

  it('sí registra el rechazo de un documento que no bloquea', async () => {
    documents.findVersion.mockImplementation((code) =>
      Promise.resolve(documentOf(code, { blocksRegistration: false })),
    );

    const recorded = await useCase.execute(
      command({
        documents: [
          {
            code: LegalDocumentCode.MARKETING,
            version: '1.0.0',
            granted: false,
          },
        ],
      }),
    );

    expect(recorded[0].granted).toBe(false);
    expect(consents.create).toHaveBeenCalledTimes(1);
    // Una negativa también se audita: es lo que prueba que la casilla no venía
    // marcada.
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'legal.consent.denied' }),
      undefined,
    );
  });

  it('exige sesión o correo: sin ninguno no hay a quién imputarlo', async () => {
    await expect(
      useCase.execute(command({ userId: null, subjectEmail: null })),
    ).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
    expect(consents.create).not.toHaveBeenCalled();
  });

  it('normaliza el correo del titular', async () => {
    await useCase.execute(
      command({ userId: null, subjectEmail: '  ANA@Test.IO ' }),
    );

    expect(consents.create).toHaveBeenCalledWith(
      expect.objectContaining({ subjectEmail: 'ana@test.io' }),
      undefined,
    );
  });

  it('rechaza una lista vacía', async () => {
    await expect(
      useCase.execute(command({ documents: [] })),
    ).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
  });

  it('usa EXACTAMENTE el error de versión desconocida', async () => {
    documents.findVersion.mockResolvedValue(null);

    await expect(useCase.execute(command())).rejects.toMatchObject({
      response: expect.objectContaining({
        errorCode: ErrorCode.LEGAL_DOCUMENT_VERSION_UNKNOWN,
      }),
    });
  });
});
