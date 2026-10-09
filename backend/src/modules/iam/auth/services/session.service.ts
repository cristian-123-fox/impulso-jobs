import { Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Role } from '@/common/types/role.enum';
import { TokenType } from '@/common/types/token-type.enum';
import { runInTransaction } from '@/common/utils/transaction.util';
import { AuditService } from '@/modules/audit/audit.service';
import { User } from '@/modules/iam/users/entities/user.entity';
import {
  type ITokenUserRepository,
  TOKEN_USER_REPOSITORY,
} from '@/modules/iam/users/repositories/token-user.repository.interface';
import {
  type IUserRepository,
  USER_REPOSITORY,
} from '@/modules/iam/users/repositories/user.repository.interface';
import { TokenService } from '@/modules/iam/auth/services/token.service';

export interface SessionClient {
  ip: string;
  userAgent: string;
}

export interface SessionResult {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; role: Role };
}

/**
 * Emite la sesión de un usuario **ya autenticado**: firma access + refresh,
 * persiste el `jti` del refresh y audita el login.
 *
 * Compartido por el login por contraseña (`LoginUseCase`) y por el de Google
 * (`GoogleLoginUseCase`): la segunda mitad del login es idéntica en ambos, y
 * duplicarla es como tener dos definiciones de "qué es una sesión".
 */
@Injectable()
export class SessionService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(TOKEN_USER_REPOSITORY)
    private readonly tokens: ITokenUserRepository,
    private readonly tokenService: TokenService,
    private readonly audit: AuditService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async issue(user: User, client: SessionClient): Promise<SessionResult> {
    const access = await this.tokenService.signAccess({
      id: user.id,
      email: user.email,
      role: user.role,
    });
    const refresh = await this.tokenService.signRefresh(user.id);

    user.failedAttempts = 0;
    user.blockedUntil = null;
    user.lastLogin = new Date();
    user.lastLoginIp = client.ip;
    user.lastLoginDevice = client.userAgent;

    await runInTransaction(this.dataSource, async (manager) => {
      await this.users.save(user, manager);
      await this.tokens.create(
        {
          id: refresh.jti,
          userId: user.id,
          tokenType: TokenType.REFRESH,
          expiresAt: refresh.expiresAt,
          revoked: false,
          userAgent: client.userAgent,
          ip: client.ip,
        },
        manager,
      );
    });

    await this.audit.record({
      action: 'auth.login.success',
      actorUserId: user.id,
      entity: 'user',
      entityId: user.id,
      ip: client.ip,
      userAgent: client.userAgent,
    });

    return {
      accessToken: access.token,
      refreshToken: refresh.token,
      user: { id: user.id, email: user.email, role: user.role },
    };
  }
}
