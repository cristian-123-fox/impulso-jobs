import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, timer } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env';
import { ApiSuccessResponse } from '@/core/models/api-response.models';
import { LoginRequest, LoginResponse } from '@/core/models/auth.models';

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

  /** TODO(M4): reemplazar por el endpoint real de reenvío de verificación. */
  resendVerification(_email: string): Observable<void> {
    return timer(900).pipe(map(() => undefined));
  }
}
