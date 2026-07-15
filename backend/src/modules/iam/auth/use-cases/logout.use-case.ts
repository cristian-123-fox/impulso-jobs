import { Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { TokenType } from '@/common/types/token-type.enum';
import { runInTransaction } from '@/common/utils/transaction.util';
import { AuditService } from '@/modules/audit/audit.service';
import {
  type ITokenUserRepository,
  TOKEN_USER_REPOSITORY,
} from '@/modules/iam/users/repositories/token-user.repository.interface';
import {
  type IBlacklistTokenRepository,
  BLACKLIST_TOKEN_REPOSITORY,
} from '@/modules/iam/users/repositories/blacklist-token.repository.interface';
import {
  RefreshTokenPayload,
  TokenService,
} from '@/modules/iam/auth/services/token.service';

export interface LogoutCommand {
  refreshToken: string;
  /** jti del access token vigente (del guard) para revocarlo también. */
  accessJti?: string;
  actorUserId?: string;
  ip: string;
  userAgent: string;
}

/** Revoca el refresh (y el access presentado) llevándolos a la blacklist. */
@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(TOKEN_USER_REPOSITORY)
    private readonly tokens: ITokenUserRepository,
    @Inject(BLACKLIST_TOKEN_REPOSITORY)
    private readonly blacklist: IBlacklistTokenRepository,
    private readonly tokenService: TokenService,
    private readonly audit: AuditService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async execute(command: LogoutCommand): Promise<void> {
    const refreshJti = await this.resolveRefreshJti(command.refreshToken);

    await runInTransaction(this.dataSource, async (manager) => {
      if (refreshJti) {
        await this.tokens.revoke(refreshJti, manager);
        await this.blacklistIfAbsent(refreshJti, TokenType.REFRESH, manager);
      }
      if (command.accessJti) {
        await this.blacklistIfAbsent(
          command.accessJti,
          TokenType.ACCESS,
          manager,
        );
      }
    });

    await this.audit.record({
      action: 'auth.logout',
      actorUserId: command.actorUserId ?? null,
      entity: 'user',
      entityId: command.actorUserId ?? null,
      ip: command.ip,
      userAgent: command.userAgent,
    });
  }

  private async resolveRefreshJti(
    refreshToken: string,
  ): Promise<string | undefined> {
    try {
      const payload = await this.tokenService.verifyRefresh(refreshToken);
      return payload.jti;
    } catch {
      // Token inválido/expirado: aún intentamos limpiar por su jti si es legible.
      return this.tokenService.decode<RefreshTokenPayload>(refreshToken)?.jti;
    }
  }

  private async blacklistIfAbsent(
    jti: string,
    tokenType: TokenType,
    manager: EntityManager,
  ): Promise<void> {
    if (await this.blacklist.existsByJti(jti, manager)) return;
    await this.blacklist.add({ jti, tokenType, reason: 'logout' }, manager);
  }
}
