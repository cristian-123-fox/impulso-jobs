import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { environment } from '@env';
import { AuthService } from '@/core/auth/auth.service';
import { ApiErrorResponse } from '@/core/models/api-response.models';

const NO_REFRESH_PATHS = ['/auth/login', '/auth/refresh'];

/**
 * 401 que **no** significan "tu sesión caducó".
 *
 * Un endpoint puede re-autenticar al titular pidiéndole su contraseña en el
 * cuerpo —cambiarla, darse de baja— y responder 401 cuando no es la correcta.
 * Ahí la sesión está perfectamente viva: lo que falla es el dato enviado. Sin
 * esta distinción el interceptor renovaba el token (con éxito), reintentaba,
 * volvía a recibir 401 y acababa cerrando la sesión — el usuario se escribía
 * mal su contraseña y aparecía en el login sin saber por qué.
 */
const NO_REFRESH_ERROR_CODES = ['AUTH_INVALID_CREDENTIALS'];

function isReauthFailure(error: HttpErrorResponse): boolean {
  const body = error.error as ApiErrorResponse | null;
  const code = body?.errorCode ?? body?.errors?.[0]?.code;
  return Boolean(code && NO_REFRESH_ERROR_CODES.includes(code));
}

/**
 * Ante un 401 en la API, intenta renovar el access con el refresh y reintenta la
 * petición una vez. Si la renovación falla, cierra sesión y va al login.
 */
export const refreshInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const isApi = req.url.startsWith(environment.apiBaseUrl);
  const isAuthFlow = NO_REFRESH_PATHS.some((path) => req.url.includes(path));

  return next(req).pipe(
    catchError((error: unknown) => {
      const canRefresh =
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        isApi &&
        !isAuthFlow &&
        !isReauthFailure(error) &&
        auth.hasRefreshToken();

      if (!canRefresh) {
        return throwError(() => error);
      }

      return auth.refreshAccessToken().pipe(
        switchMap((accessToken) =>
          next(req.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } })),
        ),
        catchError((refreshError: unknown) => {
          auth.clearSession();
          void router.navigateByUrl('/auth/login');
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
