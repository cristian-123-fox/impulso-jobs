import { Role } from '@/common/types/role.enum';

/** Identidad resuelta por la `JwtStrategy` y adjuntada al request. */
export interface AuthenticatedUser {
  userId: string;
  email: string;
  /** Rol primario denormalizado (para redirección/visualización). */
  role: Role;
  /** IDs de todos los roles asignados (`user_roles`), fuente del guard. */
  roleIds: string[];
  /** Identificador del token (para blacklist/logout). */
  jti: string;
}
