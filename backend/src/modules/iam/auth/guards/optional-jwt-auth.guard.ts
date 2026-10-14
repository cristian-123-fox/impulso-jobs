import { Injectable, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { AuthenticatedUser } from '@/common/types/authenticated-user';

/**
 * Adjunta el usuario si hay un token válido, y sigue de largo si no lo hay.
 *
 * Lo necesitan los endpoints que ocurren **con y sin sesión**: registrar que
 * alguien acepta el aviso de privacidad vale igual en el alta de una cuenta
 * (con token, se imputa al `user_id`) que en el formulario de contacto o el
 * newsletter del pie (sin token, se imputa al correo que el propio formulario
 * pide). Con `JwtAuthGuard` los segundos no pasarían.
 *
 * Se traga dos situaciones distintas a propósito, y conviene no confundirlas:
 *
 * - **No hay token.** Es el caso normal de este guard. Silencio.
 * - **Hay token pero es inválido** (expirado, revocado, en blacklist). También
 *   se deja pasar, porque quien llama sin sesión tiene derecho a registrar su
 *   consentimiento igual; pero se avisa al log, porque un volumen alto de tokens
 *   inválidos en este endpoint sí es un indicio de algo raro.
 *
 * Quien necesite sesión obligatoria usa `JwtAuthGuard`.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(OptionalJwtAuthGuard.name);

  handleRequest<TUser = AuthenticatedUser>(
    err: unknown,
    user: TUser | false,
  ): TUser | undefined {
    if (err) {
      this.logger.warn(
        `Token presente pero no válido en un endpoint de sesión opcional: ${
          err instanceof Error ? err.message : JSON.stringify(err)
        }`,
      );
      return undefined;
    }
    return user || undefined;
  }
}
