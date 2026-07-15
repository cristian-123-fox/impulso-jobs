import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanMatchFn, Router } from '@angular/router';
import { AuthService } from '@/core/auth/auth.service';
import { Role } from '@/core/models/role.enum';

/**
 * Exige sesión activa. En SSR/prerender no se aplica (no hay sesión en el
 * servidor); se hace valer en el cliente tras la hidratación.
 */
export const authGuard: CanMatchFn = () => {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) return true;

  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAuthenticated() ? true : router.createUrlTree(['/auth/login']);
};

/** Exige sesión con uno de los roles indicados. Autorización real: el backend. */
export function roleGuard(roles: readonly Role[]): CanMatchFn {
  return () => {
    const platformId = inject(PLATFORM_ID);
    if (!isPlatformBrowser(platformId)) return true;

    const auth = inject(AuthService);
    const router = inject(Router);
    const user = auth.currentUser();
    if (user && roles.includes(user.role)) return true;
    return router.createUrlTree([user ? '/' : '/auth/login']);
  };
}
