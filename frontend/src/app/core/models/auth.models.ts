import { Role } from '@/core/models/role.enum';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  /**
   * Nombre para mostrar (T27). Opcional porque el login no lo devuelve: lo
   * añade `GET /auth/me` al hidratar la sesión.
   */
  displayName?: string;
  /** Foto del candidato o logo de la empresa (T27). URL absoluta. */
  avatarUrl?: string | null;
  /**
   * Permisos efectivos (`GET /auth/me`). Sólo deciden qué se **muestra** —el
   * menú de un miembro de empresa con un rol restringido—; quien autoriza es
   * el backend. Ausente hasta que se hidrata la sesión.
   */
  permissions?: string[];
}

/** Respuesta de `GET /auth/me`: identidad completa de la sesión activa. */
export interface CurrentUserResponse {
  id: string;
  email: string;
  role: Role;
  displayName: string;
  avatarUrl: string | null;
  permissions: string[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}
