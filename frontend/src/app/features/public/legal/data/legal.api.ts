import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, type Observable } from 'rxjs';
import { environment } from '@env';
import type { ApiSuccessResponse } from '@/core/models/api-response.models';

/**
 * Cliente HTTP del módulo legal. Espejo de `LegalController` en el backend.
 *
 * Tipos escritos a mano **derivados del Swagger** (`GET /docs-json`), como el
 * resto de la app mientras no exista `@impulso/api-contract`.
 */

export interface LegalDocumentSummary {
  code: LegalDocCodeWire;
  version: string;
  locale: string;
  title: string;
  effectiveDate: string;
  isCurrent: boolean;
  blocksRegistration: boolean;
}

export interface AcceptedDocument {
  code: LegalDocCodeWire;
  version: string;
  contentHash?: string;
  granted: boolean;
}

export type LegalDocCodeWire =
  | 'TERMS'
  | 'PRIVACY'
  | 'COOKIES'
  | 'REFUND'
  | 'IMAGE_RIGHTS'
  | 'MARKETING';

export type ConsentMethodWire = 'TACIT' | 'EXPRESS_CHECKBOX' | 'EXPRESS_WRITTEN';

export type ConsentSourceWire =
  | 'REGISTRATION'
  | 'GOOGLE_REGISTRATION'
  | 'LOGIN'
  | 'CONTACT_FORM'
  | 'NEWSLETTER'
  | 'VACANCY_APPLICATION'
  | 'VACANCY_REPORT'
  | 'PROFILE_PHOTO'
  | 'RESUME_DOWNLOAD'
  | 'CHECKOUT'
  | 'SUBSCRIPTION'
  | 'TERMS_PAGE'
  | 'ACCOUNT_SETTINGS'
  | 'COOKIE_BANNER';

export interface RecordConsentBody {
  documents: AcceptedDocument[];
  method: ConsentMethodWire;
  source: ConsentSourceWire;
  /** Sólo sin sesión; el backend da prioridad al token si lo hay. */
  subjectEmail?: string;
  metadata?: Record<string, unknown>;
}

export interface LegalConsentRecord {
  id: string;
  documentCode: LegalDocCodeWire;
  documentVersion: string;
  granted: boolean;
  consentMethod: ConsentMethodWire;
  source: ConsentSourceWire;
  ip?: string | null;
  userAgent?: string | null;
  consentedAt: string;
  metadata?: Record<string, unknown> | null;
}

@Injectable({ providedIn: 'root' })
export class LegalApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/legal`;

  /** Versiones vigentes. El front las compara con `LEGAL_DOCUMENTS`. */
  currentDocuments(): Observable<LegalDocumentSummary[]> {
    return this.http
      .get<ApiSuccessResponse<LegalDocumentSummary[]>>(`${this.base}/documents`)
      .pipe(map((response) => response.content));
  }

  /** Historial de versiones de un documento. */
  history(code: LegalDocCodeWire): Observable<LegalDocumentSummary[]> {
    return this.http
      .get<ApiSuccessResponse<LegalDocumentSummary[]>>(
        `${this.base}/documents/${code}/history`,
      )
      .pipe(map((response) => response.content));
  }

  /**
   * Registra la aceptación. Devuelve lo guardado para que la vista pueda
   * mostrar la referencia (`id`, fecha) sin tener que construirla a mano.
   */
  record(
    body: RecordConsentBody,
  ): Observable<LegalConsentRecord[]> {
    return this.http
      .post<ApiSuccessResponse<{ recorded: LegalConsentRecord[] }>>(
        `${this.base}/consents`,
        body,
      )
      .pipe(map((response) => response.content.recorded));
  }

  /** Historial del titular. Exige sesión. */
  mine(): Observable<LegalConsentRecord[]> {
    return this.http
      .get<ApiSuccessResponse<LegalConsentRecord[]>>(`${this.base}/consents`)
      .pipe(map((response) => response.content));
  }

  /** Revoca un consentimiento vigente. Exige sesión. */
  withdraw(
    code: LegalDocCodeWire,
    reason?: string,
  ): Observable<LegalConsentRecord> {
    return this.http
      .post<ApiSuccessResponse<LegalConsentRecord>>(
        `${this.base}/consents/withdraw`,
        reason ? { code, reason } : { code },
      )
      .pipe(map((response) => response.content));
  }
}