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
}

/** Respuesta de `GET /auth/me`: identidad completa de la sesión activa. */
export interface CurrentUserResponse {
  id: string;
  email: string;
  role: Role;
  displayName: string;
  avatarUrl: string | null;
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
