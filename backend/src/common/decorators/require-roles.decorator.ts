import { SetMetadata } from '@nestjs/common';
import { Role } from '@/common/types/role.enum';

export const REQUIRED_ROLES_KEY = 'requiredRoles';

/**
 * Restringe un controlador a ciertos roles de plataforma.
 *
 * Complementa a `@RequirePermissions`, no lo sustituye: el permiso dice *qué*
 * se puede hacer y varios roles pueden compartirlo (una empresa también tiene
 * `company_users.manage` sobre **su** equipo), mientras que esto dice *quién*
 * puede entrar a un área. Es lo que separa el back-office del autoservicio.
 */
export const RequireRoles = (...roles: Role[]) =>
  SetMetadata(REQUIRED_ROLES_KEY, roles);
