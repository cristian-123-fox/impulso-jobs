import { Injectable, inject } from '@angular/core';
import { type Observable, catchError, of } from 'rxjs';
import { ConsentService } from '@/core/consent/consent.service';
import type { CookiePreferences } from '@/core/consent/consent.config';
import { LegalDocCode, versionOf } from '@/shared/catalogs/legal.catalogs';
import {
  type AcceptedDocument,
  LegalApi,
  type LegalConsentRecord,
  type RecordConsentBody,
} from '@/features/public/legal/data/legal.api';

/**
 * Puente entre el estado de cookies del navegador y la constancia legal.
 *
 * Son dos cosas distintas que se confunden a menudo:
 *
 * - `ConsentService` responde **"¿puedo cargar este tercero ahora mismo?"**, y
 *   vive en el cliente, en una cookie, sin red.
 * - Esta fachada responde **"qué aceptó este visitante y cuándo"**, y deja
 *   prueba en `legal_consents`.
 *
 * Lo primero es técnico y volátil; lo segundo es evidencia y no se toca. Por eso
 * el banner llama a esta fachada en cuanto alguien responde, y no cada vez que
 * se vuelve a pintar.
 *
 * ## Por qué ningún error de registro rompe la web
 *
 * Todos los métodos devuelven `catchError(() => of([]))`. Un aviso de que no se
 * pudo guardar la constancia **no puede impedir navegar**: sería usar el derecho
 * del titular como castigo, que es justo lo contrario de lo que la ley busca. El
 * fallo queda en el log del servidor (`AuditService` y el propio 500), y la
 * interfaz simplemente no confirma lo que no se pudo guardar.
 */
@Injectable({ providedIn: 'root' })
export class LegalConsentFacade {
  private readonly api = inject(LegalApi);
  private readonly consent = inject(ConsentService);

  /**
   * Traduce unas preferencias de cookies a un registro de consentimiento.
   *
   * **Una sola fila de `COOKIES`**, con el detalle categoría por categoría dentro
   * de `metadata`. Mandar una fila por categoría parecería más fino, pero
   * duplicaría el mismo documento cinco veces en `legal_consents` y la última
   * fila gana al reconstruir el estado — así que el detalle va donde importa:
   * en el JSON, no en filas.
   */
  recordCookiePreferences(
    subjectEmail?: string | null,
  ): Observable<LegalConsentRecord[]> {
    const preferences = this.consent.current();

    const body: RecordConsentBody = {
      documents: [
        {
          code: 'COOKIES',
          version: versionOf(LegalDocCode.COOKIES),
          granted: true,
        },
      ],
      method: 'EXPRESS_CHECKBOX',
      source: 'COOKIE_BANNER',
      ...(subjectEmail ? { subjectEmail } : {}),
      metadata: { preferences, formId: 'cookie-banner' },
    };

    return this.api.record(body).pipe(catchError(() => of([])));
  }

  /**
   * Registro genérico para los formularios con casillas propias (registro,
   * contacto, postulación, checkout).
   *
   * `subjectEmail` sólo se usa sin sesión: con token, el backend da prioridad
   * al `userId` del JWT e ignora el correo del cuerpo, así que mandarlo sería
   * ruido.
   */
  record(
    documents: AcceptedDocument[],
    source: RecordConsentBody['source'],
    metadata?: Record<string, unknown>,
    subjectEmail?: string | null,
  ): Observable<LegalConsentRecord[]> {
    const body: RecordConsentBody = {
      documents,
      method: 'EXPRESS_WRITTEN',
      source,
      ...(subjectEmail ? { subjectEmail } : {}),
      ...(metadata ? { metadata } : {}),
    };

    return this.api.record(body).pipe(catchError(() => of([])));
  }

  /** Historial del titular. Exige sesión; sin ella devuelve vacío. */
  mine(): Observable<LegalConsentRecord[]> {
    return this.api.mine().pipe(catchError(() => of([])));
  }

  /** Revoca un consentimiento. El registro anterior no se borra. */
  withdraw(
    code: LegalDocCode,
    reason?: string,
  ): Observable<LegalConsentRecord | null> {
    return this.api.withdraw(code, reason).pipe(catchError(() => of(null)));
  }
}