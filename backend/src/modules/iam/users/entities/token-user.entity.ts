import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { TokenType } from '@/common/types/token-type.enum';

/**
 * Refresh tokens persistidos. `id` = `jti` del token (para poder revocar y
 * validar en `/auth/refresh`).
 */
@Entity('tokens_users')
export class TokenUser extends BaseEntity {
  @Index('idx_tokens_users_user_id')
  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  userId!: string;

  @Column({
    name: 'token_type',
    type: 'varchar',
    length: 20,
    default: TokenType.REFRESH,
  })
  tokenType!: TokenType;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt!: Date;

  @Column({ type: 'boolean', default: false })
  revoked!: boolean;

  @Column({ name: 'user_agent', type: 'varchar', length: 255, nullable: true })
  userAgent?: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip?: string | null;
}
