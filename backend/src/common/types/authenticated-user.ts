import { Role } from '@/common/types/role.enum';

/** Identidad resuelta por la `JwtStrategy` y adjuntada al request. */
export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: Role;
  /** Identificador del token (para blacklist/logout). */
  jti: string;
}
