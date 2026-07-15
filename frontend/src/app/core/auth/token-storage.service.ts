import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthUser } from '@/core/models/auth.models';

const ACCESS_KEY = 'ij_access';
const REFRESH_KEY = 'ij_refresh';
const USER_KEY = 'ij_user';

/**
 * Persistencia de la sesión en `localStorage`, protegida para SSR (en servidor
 * no hay almacenamiento, así que todo devuelve `null` / no-op).
 */
@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  get access(): string | null {
    return this.isBrowser ? localStorage.getItem(ACCESS_KEY) : null;
  }

  get refresh(): string | null {
    return this.isBrowser ? localStorage.getItem(REFRESH_KEY) : null;
  }

  get user(): AuthUser | null {
    if (!this.isBrowser) return null;
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }

  setSession(access: string, refresh: string, user: AuthUser): void {
    if (!this.isBrowser) return;
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  setAccess(access: string): void {
    if (!this.isBrowser) return;
    localStorage.setItem(ACCESS_KEY, access);
  }

  clear(): void {
    if (!this.isBrowser) return;
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  }
}
