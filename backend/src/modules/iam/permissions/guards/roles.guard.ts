import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_ROLES_KEY } from '@/common/decorators/require-roles.decorator';
import { AppException } from '@/common/exceptions/app.exception';
import { AuthenticatedUser } from '@/common/types/authenticated-user';
import { ErrorCode } from '@/common/types/error-code.enum';
import { Role } from '@/common/types/role.enum';

/**
 * Autorización por rol de plataforma. Debe ejecutarse tras `JwtAuthGuard`.
 *
 * Cierra el back-office: sin esto, cualquier rol que comparta un permiso con el
 * administrador (la empresa tiene `companies.read` y `company_users.manage`
 * sobre la suya) podría entrar a `/admin/**` y operar sobre datos de terceros.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required =
      this.reflector.getAllAndOverride<Role[]>(REQUIRED_ROLES_KEY, [
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

    if (!required.includes(user.role)) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        ErrorCode.PERMISSION_DENIED,
        'No tienes permiso para realizar esta acción.',
      );
    }
    return true;
  }
}
