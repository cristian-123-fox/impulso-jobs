import { Role } from '@/common/types/role.enum';

const PRIORITY: readonly Role[] = [Role.ADMIN, Role.EMPLOYER, Role.CANDIDATE];

/**
 * Rol primario (denormalizado en `users.role`) a partir de los códigos de rol
 * asignados: prioriza ADMIN > EMPLOYER > CANDIDATE. `null` si no hay ninguno de
 * plataforma (no se toca el valor actual).
 */
export function derivePrimaryRole(codes: readonly string[]): Role | null {
  for (const role of PRIORITY) {
    if (codes.includes(role)) return role;
  }
  return null;
}
