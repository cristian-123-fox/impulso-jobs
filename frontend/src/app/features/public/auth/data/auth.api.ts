import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env';
import { ApiSuccessResponse } from '@/core/models/api-response.models';
import { LoginRequest, LoginResponse } from '@/core/models/auth.models';
import {
  ConfirmResetPayload,
  RegisterPayload,
  RegisterResult,
} from '@/features/public/auth/models/auth.models';

/** Cliente HTTP del feature de autenticación (desenvuelve el envelope). */
@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<ApiSuccessResponse<LoginResponse>>(`${this.base}/auth/login`, request)
      .pipe(map((response) => response.content));
  }

  /** Registro único empresa/candidato (discrimina por accountType). */
  register(payload: RegisterPayload): Observable<RegisterResult> {
    return this.http
      .post<ApiSuccessResponse<RegisterResult>>(
        `${this.base}/auth/register`,
        payload,
      )
      .pipe(map((response) => response.content));
  }

  /** Reenvía el enlace de verificación de correo (respuesta siempre genérica). */
  resendVerification(email: string): Observable<void> {
    return this.http
      .post<ApiSuccessResponse<unknown>>(
        `${this.base}/auth/email-verification/resend`,
        { email },
      )
      .pipe(map(() => undefined));
  }

  /** Confirma la verificación de correo con el token del magic link. */
  confirmEmailVerification(
    token: string,
  ): Observable<{ alreadyVerified: boolean }> {
    const params = new HttpParams().set('token', token);
    return this.http
      .get<ApiSuccessResponse<{ alreadyVerified: boolean }>>(
        `${this.base}/auth/email-verification/confirm`,
        { params },
      )
      .pipe(map((response) => response.content));
  }

  /** Solicita el magic link de recuperación (respuesta siempre genérica). */
  requestPasswordReset(email: string): Observable<void> {
    return this.http
      .post<ApiSuccessResponse<unknown>>(
        `${this.base}/auth/password-reset/request`,
        { email },
      )
      .pipe(map(() => undefined));
  }

  /** Valida que el token del enlace siga siendo utilizable. */
  validateResetToken(token: string): Observable<void> {
    return this.http
      .post<ApiSuccessResponse<{ valid: boolean }>>(
        `${this.base}/auth/password-reset/validate`,
        { token },
      )
      .pipe(map(() => undefined));
  }

  /** Confirma la nueva contraseña y consume el token (un solo uso). */
  confirmPasswordReset(payload: ConfirmResetPayload): Observable<void> {
    return this.http
      .post<ApiSuccessResponse<unknown>>(
        `${this.base}/auth/password-reset/confirm`,
        payload,
      )
      .pipe(map(() => undefined));
  }
}
