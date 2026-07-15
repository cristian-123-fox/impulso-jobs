import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { TokenType } from '@/common/types/token-type.enum';

/** Tokens revocados/expirados/logout. Consultado por `jti` en cada request. */
@Entity('blacklist_tokens')
export class BlacklistToken extends BaseEntity {
  @Index('uq_blacklist_tokens_jti', { unique: true })
  @Column({ type: 'varchar', length: 36 })
  jti!: string;

  @Column({ name: 'token_type', type: 'varchar', length: 20 })
  tokenType!: TokenType;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt?: Date | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  reason?: string | null;
}
