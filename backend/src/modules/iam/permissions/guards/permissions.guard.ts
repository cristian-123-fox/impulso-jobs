import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_PERMISSIONS_KEY } from '@/common/decorators/require-permissions.decorator';
import { AppException } from '@/common/exceptions/app.exception';
import { AuthenticatedUser } from '@/common/types/authenticated-user';
import { ErrorCode } from '@/common/types/error-code.enum';
import { PermissionsService } from '@/modules/iam/permissions/services/permissions.service';

/**
 * Autorización por permisos. Debe ejecutarse tras `JwtAuthGuard` (que adjunta
 * `req.user`). Lee `@RequirePermissions(...)` y valida contra los roles del usuario.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissions: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required =
      this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (required.length === 0) return true;

    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user) {
      throw new AppException(
        HttpStatus.UNAUTHORIZED,
        ErrorCode.UNAUTHORIZED,
        'No autorizado.',
      );
    }

    const allowed = await this.permissions.hasPermissions(
      user.roleIds,
      required,
    );
    if (!allowed) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        ErrorCode.PERMISSION_DENIED,
        'No tienes permiso para realizar esta acción.',
      );
    }
    return true;
  }
}
