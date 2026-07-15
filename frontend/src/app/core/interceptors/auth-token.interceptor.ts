import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '@env';
import { TokenStorageService } from '@/core/auth/token-storage.service';

/** Endpoints que NO llevan Authorization (obtienen/renuevan credenciales). */
const NO_AUTH_PATHS = ['/auth/login', '/auth/refresh'];

/** Adjunta `Authorization: Bearer <access>` a las peticiones a la API propia. */
export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const storage = inject(TokenStorageService);
  const token = storage.access;
  const isApi = req.url.startsWith(environment.apiBaseUrl);
  const skip = NO_AUTH_PATHS.some((path) => req.url.includes(path));

  if (token && isApi && !skip) {
    return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
  }
  return next(req);
};
