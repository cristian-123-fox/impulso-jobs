import { Role } from '@/core/models/role.enum';

/**
 * La propia cuenta (`GET /account/profile`). Es la fila de `users`, no el
 * nombre resuelto que devuelve `GET /auth/me`: aquí se edita, y enseñar un
 * valor que viene de otra tabla haría que el formulario guardara otra cosa.
 */
export interface AccountProfile {
  id: string;
  email: string;
  role: Role;
  emailVerified: boolean;
  createdAt: string;
  lastLogin: string | null;
  firstName: string | null;
  lastName: string | null;
  /** E.164. Se pinta con su país, que `+1` no distingue (T36). */
  phone: string | null;
  phoneCountry: string | null;
  jobTitle: string | null;
  photoUrl: string | null;
}

/** Un campo ausente no se toca; uno en blanco lo borra. */
export interface UpdateAccountProfilePayload {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  phoneCountry?: string | null;
  jobTitle?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}
