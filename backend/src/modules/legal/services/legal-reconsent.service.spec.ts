import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { LegalConsent } from '@/modules/legal/entities/legal-consent.entity';
import { LegalDocument } from '@/modules/legal/entities/legal-document.entity';
import {
  ConsentSource,
  LegalDocumentCode,
} from '@/modules/legal/enums/legal.enums';
import { ILegalConsentRepository } from '@/modules/legal/repositories/legal-consent.repository.interface';
import { ILegalDocumentRepository } from '@/modules/legal/repositories/legal-document.repository.interface';
import { RecordConsentUseCase } from '@/modules/legal/use-cases/record-consent.use-case';
import { LegalReconsentService } from './legal-reconsent.service';

function documentOf(
  code: LegalDocumentCode,
  overrides: Partial<LegalDocument> = {},
): LegalDocument {
  return Object.assign(new LegalDocument(), {
    id: `doc-${code}`,
    code,
    version: '1.0.0',
    locale: 'es',
    title: 'Términos',
    effectiveDate: '2026-10-01',
    contentHash: null,
    isCurrent: true,
    blocksRegistration: true,
    ...overrides,
  });
}

function consentOf(
  code: LegalDocumentCode,
  version: string,
  granted: boolean,
): LegalConsent {
  return Object.assign(new LegalConsent(), {
    id: `consent-${code}`,
    userId: 'user-1',
    subjectEmail: 'persona@ejemplo.com',
    documentCode: code,
    documentVersion: version,
    granted,
    consentMethod: 'EXPRESS_CHECKBOX',
    source: ConsentSource.REGISTRATION,
    createdAt: new Date('2026-10-01T12:00:00Z'),
  });
}

describe('LegalReconsentService', () => {
  let consents: jest.Mocked<ILegalConsentRepository>;
  let documents: jest.Mocked<ILegalDocumentRepository>;
  let record: jest.Mocked<RecordConsentUseCase>;
  let service: LegalReconsentService;

  const TERMS = documentOf(LegalDocumentCode.TERMS);
  // El Aviso está en 1.1.0: es el documento que "cambió" en estas pruebas.
  const PRIVACY = documentOf(LegalDocumentCode.PRIVACY, {
    title: 'Aviso',
    version: '1.1.0',
  });
  const COOKIES = documentOf(LegalDocumentCode.COOKIES, {
    blocksRegistration: false,
  });

  const baseCommand = {
    userId: 'user-1',
    email: 'persona@ejemplo.com',
    ip: '127.0.0.1',
    userAgent: 'jest',
  };

  beforeEach(() => {
    consents = {
      create: jest.fn(),
      listBySubject: jest.fn(),
      hasActiveConsent: jest.fn(),
      findLatestByCodes: jest.fn().mockResolvedValue([]),
      findAndCount: jest.fn(),
      summarize: jest.fn(),
    };
    documents = {
      listCurrent: jest.fn().mockResolvedValue([TERMS, PRIVACY, COOKIES]),
      findVersion: jest.fn(),
      listHistory: jest.fn(),
    };
    record = {
      execute: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<RecordConsentUseCase>;

    service = new LegalReconsentService(consents, documents, record);
  });

  describe('sin nada que re-consentir', () => {
    it('deja entrar cuando la versión aceptada es la vigente', async () => {
      consents.findLatestByCodes.mockResolvedValue([
        consentOf(LegalDocumentCode.TERMS, '1.0.0', true),
        consentOf(LegalDocumentCode.PRIVACY, '1.1.0', true),
      ]);

      await service.requireCurrentVersions(baseCommand);

      expect(record.execute).not.toHaveBeenCalled();
    });

    it('no escribe por cambiar un documento que no bloquea el servicio', async () => {
      // Cookie cambia de versión: es un documento informativo, no se bloquea a
      // nadie por no re-aceptarlo.
      consents.findLatestByCodes.mockResolvedValue([
        consentOf(LegalDocumentCode.TERMS, '1.0.0', true),
        consentOf(LegalDocumentCode.PRIVACY, '1.1.0', true),
        consentOf(LegalDocumentCode.COOKIES, '0.9.0', true),
      ]);

      await service.requireCurrentVersions(baseCommand);

      expect(record.execute).not.toHaveBeenCalled();
    });
  });

  describe('con una versión nueva publicada', () => {
    beforeEach(() => {
      // Aceptó el Aviso en 1.0.0, pero la vigente es 1.1.0.
      consents.findLatestByCodes.mockResolvedValue([
        consentOf(LegalDocumentCode.TERMS, '1.0.0', true),
        consentOf(LegalDocumentCode.PRIVACY, '1.0.0', true),
      ]);
    });

    it('bloquea si el login no trae aceptación', async () => {
      await expect(service.requireCurrentVersions(baseCommand)).rejects.toThrow(
        AppException,
      );

      expect(record.execute).not.toHaveBeenCalled();
    });

    it('el error es LEGAL_VERSION_OUTDATED y dice qué documento cambió', async () => {
      const error = await service
        .requireCurrentVersions(baseCommand)
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(AppException);
      const response = (error as AppException).getResponse() as {
        errorCode: string;
      };
      expect(response.errorCode).toBe(ErrorCode.LEGAL_VERSION_OUTDATED);
      expect((error as AppException).message).toContain('Aviso');
      expect((error as AppException).message).toContain('1.1.0');
    });

    it('bloquea si llega marcado pero en la versión anterior', async () => {
      // El código está bien y la casilla marcada, pero el texto que dice haber
      // aceptado es el viejo: es justo el caso que hay que impedir.
      await expect(
        service.requireCurrentVersions({
          ...baseCommand,
          legal: {
            documents: [
              {
                code: LegalDocumentCode.PRIVACY,
                version: '1.0.0',
                granted: true,
              },
            ],
          },
        }),
      ).rejects.toThrow(AppException);

      expect(record.execute).not.toHaveBeenCalled();
    });

    it('bloquea si llega sin marcar', async () => {
      await expect(
        service.requireCurrentVersions({
          ...baseCommand,
          legal: {
            documents: [
              {
                code: LegalDocumentCode.PRIVACY,
                version: '1.1.0',
                granted: false,
              },
            ],
          },
        }),
      ).rejects.toThrow(AppException);

      expect(record.execute).not.toHaveBeenCalled();
    });

    it('deja pasar y registra la aceptación de la versión vigente', async () => {
      await service.requireCurrentVersions({
        ...baseCommand,
        legal: {
          documents: [
            {
              code: LegalDocumentCode.PRIVACY,
              version: '1.1.0',
              granted: true,
            },
          ],
        },
      });

      expect(record.execute).toHaveBeenCalledTimes(1);
      expect(record.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          source: ConsentSource.LOGIN,
          userId: 'user-1',
          documents: [
            {
              code: LegalDocumentCode.PRIVACY,
              version: '1.1.0',
              granted: true,
            },
          ],
        }),
      );
    });
  });

  describe('una cuenta anterior al registro de consentimiento', () => {
    beforeEach(() => {
      // Sin ninguna fila: no es que aceptara una versión vieja, es que nunca
      // dejó constancia. El mensaje tiene que distinguirlo.
      consents.findLatestByCodes.mockResolvedValue([]);
    });

    it('responde LEGAL_CONSENT_REQUIRED, no «actualizamos»', async () => {
      const error = await service
        .requireCurrentVersions(baseCommand)
        .catch((e: unknown) => e);

      const response = (error as AppException).getResponse() as {
        errorCode: string;
      };
      expect(response.errorCode).toBe(ErrorCode.LEGAL_CONSENT_REQUIRED);
      // Decir «actualizamos» a quien nunca aceptó sería untrue.
      expect((error as AppException).message).not.toContain('Actualizamos');
      expect((error as AppException).message).toContain('Antes de entrar');
    });

    it('deja pasar y registra al aceptar la versión vigente', async () => {
      await service.requireCurrentVersions({
        ...baseCommand,
        legal: {
          documents: [
            { code: LegalDocumentCode.TERMS, version: '1.0.0', granted: true },
            {
              code: LegalDocumentCode.PRIVACY,
              version: '1.1.0',
              granted: true,
            },
          ],
        },
      });

      expect(record.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          source: ConsentSource.LOGIN,
          documents: [
            { code: LegalDocumentCode.TERMS, version: '1.0.0', granted: true },
            {
              code: LegalDocumentCode.PRIVACY,
              version: '1.1.0',
              granted: true,
            },
          ],
        }),
      );
    });

    it('los separa de un cambio de versión real', async () => {
      const result = await service.outdated('user-1', 'persona@ejemplo.com');

      expect(result.neverAccepted).toHaveLength(2);
      expect(result.versionChanged).toHaveLength(0);
    });
  });

  describe('quien nunca aceptó', () => {
    it('bloquea aunque no tenga ninguna fila', async () => {
      consents.findLatestByCodes.mockResolvedValue([]);

      await expect(service.requireCurrentVersions(baseCommand)).rejects.toThrow(
        AppException,
      );
    });

    it('bloquea si lo que tiene es una revocación', async () => {
      consents.findLatestByCodes.mockResolvedValue([
        consentOf(LegalDocumentCode.TERMS, '1.0.0', true),
        consentOf(LegalDocumentCode.TERMS, '1.0.0', false),
        consentOf(LegalDocumentCode.PRIVACY, '1.1.0', true),
      ]);

      await expect(service.requireCurrentVersions(baseCommand)).rejects.toThrow(
        AppException,
      );
    });
  });

  describe('outdated()', () => {
    it('devuelve vacío cuando todo está vigente', async () => {
      consents.findLatestByCodes.mockResolvedValue([
        consentOf(LegalDocumentCode.TERMS, '1.0.0', true),
        consentOf(LegalDocumentCode.PRIVACY, '1.1.0', true),
      ]);

      const result = await service.outdated('user-1', 'persona@ejemplo.com');

      expect(result.documents).toEqual([]);
      expect(result.neverAccepted).toEqual([]);
      expect(result.versionChanged).toEqual([]);
    });

    it('devuelve sólo los bloqueantes desactualizados', async () => {
      consents.findLatestByCodes.mockResolvedValue([
        consentOf(LegalDocumentCode.TERMS, '1.0.0', true),
        consentOf(LegalDocumentCode.PRIVACY, '1.0.0', true),
      ]);

      const result = await service.outdated('user-1', 'persona@ejemplo.com');

      expect(result.documents).toHaveLength(1);
      expect(result.versionChanged).toHaveLength(1);
      expect(result.versionChanged[0]?.code).toBe(LegalDocumentCode.PRIVACY);
      expect(result.neverAccepted).toEqual([]);
    });

    it('no consulta cookies, que no bloquean', async () => {
      consents.findLatestByCodes.mockResolvedValue([
        consentOf(LegalDocumentCode.TERMS, '1.0.0', true),
        consentOf(LegalDocumentCode.PRIVACY, '1.1.0', true),
      ]);

      await service.outdated('user-1', 'persona@ejemplo.com');

      expect(consents.findLatestByCodes).toHaveBeenCalledWith(
        'user-1',
        'persona@ejemplo.com',
        [LegalDocumentCode.TERMS, LegalDocumentCode.PRIVACY],
      );
    });
  });
});
