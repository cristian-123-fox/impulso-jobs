import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { environment } from '@env';
import { AuthService } from '@/core/auth/auth.service';

const NO_REFRESH_PATHS = ['/auth/login', '/auth/refresh'];

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
