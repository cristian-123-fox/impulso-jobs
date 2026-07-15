import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, finalize, map, shareReplay, tap } from 'rxjs/operators';
import { environment } from '@env';
import { ApiSuccessResponse } from '@/core/models/api-response.models';
import { AuthUser, LoginResponse } from '@/core/models/auth.models';
import { Role } from '@/core/models/role.enum';
import { TokenStorageService } from '@/core/auth/token-storage.service';

/** Áreas de aterrizaje por rol (empresa/candidato al panel demo por ahora). */
const ROLE_HOME: Record<Role, string> = {
  [Role.ADMIN]: '/admin',
  [Role.EMPLOYER]: '/panel',
  [Role.CANDIDATE]: '/panel',
};

/**
 * Sesión singleton: estado del usuario, almacenamiento de tokens y renovación
 * del access (single-flight). Fuente de verdad de la sesión en el cliente.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly storage = inject(TokenStorageService);
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  private readonly user = signal<AuthUser | null>(this.storage.user);
  readonly currentUser = this.user.asReadonly();
  readonly isAuthenticated = computed(() => this.user() !== null);

  /** Renovación en curso compartida para no lanzar varias a la vez. */
  private refresh$?: Observable<string>;

  setSession(response: LoginResponse): void {
    this.storage.setSession(response.accessToken, response.refreshToken, response.user);
    this.user.set(response.user);
  }

  clearSession(): void {
    this.storage.clear();
    this.user.set(null);
    this.refresh$ = undefined;
  }

  hasRefreshToken(): boolean {
    return this.storage.refresh !== null;
  }

  refreshAccessToken(): Observable<string> {
    if (!this.refresh$) {
      const refreshToken = this.storage.refresh;
      if (!refreshToken) {
        return throwError(() => new Error('No hay refresh token disponible.'));
      }
      this.refresh$ = this.http
        .post<ApiSuccessResponse<{ accessToken: string }>>(`${this.base}/auth/refresh`, {
          refreshToken,
        })
        .pipe(
          map((response) => response.content.accessToken),
          tap((accessToken) => this.storage.setAccess(accessToken)),
          shareReplay({ bufferSize: 1, refCount: true }),
          finalize(() => {
            this.refresh$ = undefined;
          }),
        );
    }
    return this.refresh$;
  }

  logout(): Observable<void> {
    const refreshToken = this.storage.refresh;
    const request = refreshToken
      ? this.http
          .post<ApiSuccessResponse<unknown>>(`${this.base}/auth/logout`, { refreshToken })
          .pipe(map(() => undefined))
      : of(undefined);
    return request.pipe(
      catchError(() => of(undefined)),
      finalize(() => this.clearSession()),
    );
  }

  redirectUrlFor(role: Role): string {
    return ROLE_HOME[role] ?? '/';
  }
}
