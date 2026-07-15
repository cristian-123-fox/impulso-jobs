import { SetMetadata } from '@nestjs/common';

export const REQUIRED_PERMISSIONS_KEY = 'required_permissions';

/**
 * Declara los permisos `component.action` necesarios para un endpoint. Se
 * evalúan en el `PermissionsGuard` contra los roles del usuario autenticado.
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);
