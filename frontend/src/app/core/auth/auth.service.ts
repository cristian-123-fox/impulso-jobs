import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, finalize, map, shareReplay, tap } from 'rxjs/operators';
import { environment } from '@env';
import { ApiSuccessResponse } from '@/core/models/api-response.models';
import {
  AuthUser,
  CurrentUserResponse,
  LoginResponse,
} from '@/core/models/auth.models';
import { Role } from '@/core/models/role.enum';
import { TokenStorageService } from '@/core/auth/token-storage.service';

/** A dónde va cada rol al iniciar sesión — cada uno a su área real. */
const ROLE_HOME: Record<Role, string> = {
  [Role.ADMIN]: '/admin',
  [Role.EMPLOYER]: '/empresa/vacantes',
  [Role.CANDIDATE]: '/candidato/perfil',
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
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly user = signal<AuthUser | null>(this.storage.user);
  readonly currentUser = this.user.asReadonly();
  readonly isAuthenticated = computed(() => this.user() !== null);

  /** Renovación en curso compartida para no lanzar varias a la vez. */
  private refresh$?: Observable<string>;

  /** `GET /auth/me` en curso o ya resuelto: una llamada por carga de la app. */
  private identity$?: Observable<AuthUser | null>;

  setSession(response: LoginResponse): void {
    this.storage.setSession(response.accessToken, response.refreshToken, response.user);
    this.user.set(response.user);
    // La respuesta del login no trae nombre ni foto: se piden acto seguido.
    this.identity$ = undefined;
    this.loadIdentity().subscribe();
  }

  clearSession(): void {
    this.storage.clear();
    this.user.set(null);
    this.refresh$ = undefined;
    this.identity$ = undefined;
  }

  /**
   * T27: completa la sesión con nombre e imagen (`GET /auth/me`). El login sólo
   * devuelve `{ id, email, role }` y el nombre vive en el perfil del dominio,
   * distinto por rol; un único endpoint evita que el cliente adivine.
   *
   * Se cachea por carga de la app —no por navegación— y sólo corre en el
   * navegador: en SSR no hay sesión que hidratar. Un fallo es silencioso: el
   * navbar se queda con el correo, que ya está en `localStorage`.
   */
  loadIdentity(): Observable<AuthUser | null> {
    if (!this.identity$) {
      if (!this.isBrowser || !this.user()) return of(null);
      this.identity$ = this.http
        .get<ApiSuccessResponse<CurrentUserResponse>>(`${this.base}/auth/me`)
        .pipe(
          map((response) => response.content),
          tap((identity) => this.mergeIdentity(identity)),
          map(() => this.user()),
          catchError(() => of(this.user())),
          shareReplay({ bufferSize: 1, refCount: false }),
        );
    }
    return this.identity$;
  }

  /**
   * El rol manda sobre lo guardado: si cambió en servidor, la sesión en curso
   * debe reflejarlo (de ahí que se sobrescriba y no se mezcle a la inversa).
   */
  private mergeIdentity(identity: CurrentUserResponse): void {
    const merged: AuthUser = {
      id: identity.id,
      email: identity.email,
      role: identity.role,
      displayName: identity.displayName,
      avatarUrl: identity.avatarUrl,
    };
    this.user.set(merged);
    this.storage.setUser(merged);
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
