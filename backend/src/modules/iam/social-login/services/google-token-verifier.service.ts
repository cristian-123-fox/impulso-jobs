import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';

/** Lo que nos importa del payload del ID token de Google. */
export interface GoogleIdentity {
  /** Sujeto estable de la cuenta Google (no cambia aunque cambie el correo). */
  sub: string;
  email: string;
  name?: string;
  givenName?: string;
  familyName?: string;
  picture?: string;
  /** p. ej. `es-MX`. Sólo una pista: no es la residencia de la persona. */
  locale?: string;
}

/**
 * Verifica el ID token de Google contra los servidores de Google.
 *
 * `verifyIdToken` comprueba firma, `iss`, `aud` (contra `GOOGLE_CLIENT_ID`) y
 * caducidad. Aquí sólo se añade la regla de negocio: el correo tiene que venir
 * verificado por Google, que es lo que permite confiar en él para crear la
 * cuenta.
 */
@Injectable()
export class GoogleTokenVerifier {
  private readonly clientId: string;
  private client: OAuth2Client | null = null;

  constructor(config: ConfigService) {
    this.clientId = (config.get<string>('GOOGLE_CLIENT_ID') ?? '').trim();
  }

  /** Sin `GOOGLE_CLIENT_ID` no hay proveedor: el botón no debe ni ofrecerse. */
  get configured(): boolean {
    return this.clientId.length > 0;
  }

  async verify(credential: string): Promise<GoogleIdentity> {
    if (!this.configured) {
      throw new AppException(
        HttpStatus.SERVICE_UNAVAILABLE,
        ErrorCode.AUTH_GOOGLE_NOT_CONFIGURED,
        'El inicio de sesión con Google no está configurado.',
      );
    }

    const ticket = await this.oauthClient()
      .verifyIdToken({ idToken: credential, audience: this.clientId })
      .catch(() => null);
    if (!ticket) {
      throw new AppException(
        HttpStatus.UNAUTHORIZED,
        ErrorCode.AUTH_GOOGLE_INVALID_TOKEN,
        'No se pudo validar la sesión de Google.',
      );
    }

    const info = ticket.getPayload();
    if (!info?.sub || !info.email || info.email_verified !== true) {
      throw new AppException(
        HttpStatus.UNAUTHORIZED,
        ErrorCode.AUTH_GOOGLE_INVALID_TOKEN,
        'La cuenta de Google no trae un correo verificado.',
      );
    }

    return {
      sub: info.sub,
      email: info.email,
      name: info.name,
      givenName: info.given_name,
      familyName: info.family_name,
      picture: info.picture,
      locale: info.locale,
    };
  }

  private oauthClient(): OAuth2Client {
    this.client ??= new OAuth2Client(this.clientId);
    return this.client;
  }
}
