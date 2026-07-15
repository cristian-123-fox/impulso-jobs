import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Role } from '@/common/types/role.enum';
import { UserStatus } from '@/common/types/user-status.enum';

/** Raíz de identidad de la plataforma. Solo mapeo a BD. */
@Entity('users')
export class User extends BaseEntity {
  @Index('uq_users_email', { unique: true })
  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 20, default: Role.CANDIDATE })
  role!: Role;

  @Column({ type: 'varchar', length: 20, default: UserStatus.ACTIVE })
  status!: UserStatus;

  @Column({ name: 'failed_attempts', type: 'int', default: 0 })
  failedAttempts!: number;

  @Column({ name: 'blocked_until', type: 'timestamp', nullable: true })
  blockedUntil?: Date | null;

  @Column({ name: 'last_login', type: 'timestamp', nullable: true })
  lastLogin?: Date | null;

  @Column({
    name: 'last_login_ip',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  lastLoginIp?: string | null;

  @Column({
    name: 'last_login_device',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  lastLoginDevice?: string | null;

  @Column({ name: 'email_verified_at', type: 'timestamp', nullable: true })
  emailVerifiedAt?: Date | null;

  /** Tokens emitidos antes de esta marca se consideran inválidos (reset/logout global). */
  @Column({ name: 'tokens_valid_from', type: 'timestamp', nullable: true })
  tokensValidFrom?: Date | null;

  @Column({ name: 'password_reset_attempts', type: 'int', default: 0 })
  passwordResetAttempts!: number;

  @Column({
    name: 'password_reset_window_start',
    type: 'timestamp',
    nullable: true,
  })
  passwordResetWindowStart?: Date | null;
}
