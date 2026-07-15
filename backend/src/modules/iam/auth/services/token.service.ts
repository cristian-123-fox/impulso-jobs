import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { Role } from '@/common/types/role.enum';
import { TokenType } from '@/common/types/token-type.enum';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: Role;
  type: TokenType.ACCESS;
  jti: string;
  /** Emitido (segundos epoch); lo agrega el JWT. Se usa para invalidación global. */
  iat?: number;
}

export interface RefreshTokenPayload {
  sub: string;
  type: TokenType.REFRESH;
  jti: string;
}

export interface ResetTokenPayload {
  sub: string;
  type: TokenType.RESET;
  jti: string;
}

export interface VerifyTokenPayload {
  sub: string;
  type: TokenType.VERIFY;
  jti: string;
}

export interface IssuedToken {
  token: string;
  jti: string;
  expiresAt: Date;
}

interface AccessSubject {
  id: string;
  email: string;
  role: Role;
}

/**
 * Emite y verifica JWT. Access y refresh usan secretos y expiraciones distintas
 * (leídas de configuración) pasadas explícitamente por token.
 */
@Injectable()
export class TokenService {
  private readonly accessSecret: string;
  private readonly accessExpiresIn: string;
  private readonly refreshSecret: string;
  private readonly refreshExpiresIn: string;
  private readonly resetSecret: string;
  private readonly resetExpiresIn: string;
  private readonly verifySecret: string;
  private readonly verifyExpiresIn: string;

  constructor(
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.accessSecret = config.getOrThrow<string>('JWT_ACCESS_SECRET');
    this.accessExpiresIn = config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m';
    this.refreshSecret = config.getOrThrow<string>('JWT_REFRESH_SECRET');
    this.refreshExpiresIn =
      config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';
    this.resetSecret =
      config.get<string>('JWT_RESET_SECRET') ??
      config.getOrThrow<string>('JWT_ACCESS_SECRET');
    this.resetExpiresIn = config.get<string>('JWT_RESET_EXPIRES_IN') ?? '30m';
    this.verifySecret =
      config.get<string>('JWT_VERIFY_SECRET') ??
      config.getOrThrow<string>('JWT_ACCESS_SECRET');
    this.verifyExpiresIn = config.get<string>('JWT_VERIFY_EXPIRES_IN') ?? '30m';
  }

  newJti(): string {
    return randomUUID();
  }

  async signAccess(
    user: AccessSubject,
    jti: string = this.newJti(),
  ): Promise<IssuedToken> {
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: TokenType.ACCESS,
      jti,
    };
    const token = await this.jwt.signAsync(payload, {
      secret: this.accessSecret,
      expiresIn: this.accessExpiresIn as JwtSignOptions['expiresIn'],
    });
    return { token, jti, expiresAt: this.expiryOf(token) };
  }

  async signRefresh(
    userId: string,
    jti: string = this.newJti(),
  ): Promise<IssuedToken> {
    const payload: RefreshTokenPayload = {
      sub: userId,
      type: TokenType.REFRESH,
      jti,
    };
    const token = await this.jwt.signAsync(payload, {
      secret: this.refreshSecret,
      expiresIn: this.refreshExpiresIn as JwtSignOptions['expiresIn'],
    });
    return { token, jti, expiresAt: this.expiryOf(token) };
  }

  verifyRefresh(token: string): Promise<RefreshTokenPayload> {
    return this.jwt.verifyAsync<RefreshTokenPayload>(token, {
      secret: this.refreshSecret,
    });
  }

  async signReset(
    userId: string,
    jti: string = this.newJti(),
  ): Promise<IssuedToken> {
    const payload: ResetTokenPayload = {
      sub: userId,
      type: TokenType.RESET,
      jti,
    };
    const token = await this.jwt.signAsync(payload, {
      secret: this.resetSecret,
      expiresIn: this.resetExpiresIn as JwtSignOptions['expiresIn'],
    });
    return { token, jti, expiresAt: this.expiryOf(token) };
  }

  verifyReset(token: string): Promise<ResetTokenPayload> {
    return this.jwt.verifyAsync<ResetTokenPayload>(token, {
      secret: this.resetSecret,
    });
  }

  async signEmailVerification(
    userId: string,
    jti: string = this.newJti(),
  ): Promise<IssuedToken> {
    const payload: VerifyTokenPayload = {
      sub: userId,
      type: TokenType.VERIFY,
      jti,
    };
    const token = await this.jwt.signAsync(payload, {
      secret: this.verifySecret,
      expiresIn: this.verifyExpiresIn as JwtSignOptions['expiresIn'],
    });
    return { token, jti, expiresAt: this.expiryOf(token) };
  }

  verifyEmailVerification(token: string): Promise<VerifyTokenPayload> {
    return this.jwt.verifyAsync<VerifyTokenPayload>(token, {
      secret: this.verifySecret,
    });
  }

  decode<T extends object>(token: string): T | null {
    return this.jwt.decode<T | null>(token);
  }

  private expiryOf(token: string): Date {
    const decoded = this.jwt.decode<{ exp?: number } | null>(token);
    return decoded?.exp ? new Date(decoded.exp * 1000) : new Date();
  }
}
