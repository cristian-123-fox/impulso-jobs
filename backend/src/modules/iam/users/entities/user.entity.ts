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

  @Column({ name: 'email_verification_attempts', type: 'int', default: 0 })
  emailVerificationAttempts!: number;

  @Column({
    name: 'email_verification_window_start',
    type: 'timestamp',
    nullable: true,
  })
  emailVerificationWindowStart?: Date | null;

  /** Notas internas del administrador sobre esta cuenta. */
  @Column({ name: 'admin_notes', type: 'text', nullable: true })
  adminNotes?: string | null;

  /**
   * Identidad de la persona. Para CANDIDATE y EMPLOYER el nombre para mostrar
   * sigue saliendo de su perfil o de su empresa (ver `UserProfileResolver`);
   * esto es lo único que tiene una cuenta ADMIN, que no tiene ni una cosa ni
   * la otra. Nullable porque las cuentas anteriores a la migración no lo traen.
   */
  @Column({ name: 'first_name', type: 'varchar', length: 80, nullable: true })
  firstName?: string | null;

  @Column({ name: 'last_name', type: 'varchar', length: 80, nullable: true })
  lastName?: string | null;

  /** E.164, normalizado con `phoneCountry` (T36). */
  @Column({ type: 'varchar', length: 20, nullable: true })
  phone?: string | null;

  /** País del teléfono (ISO 3166-1 alpha-2). `+1` es US y CA a la vez. */
  @Column({ name: 'phone_country', type: 'varchar', length: 2, nullable: true })
  phoneCountry?: string | null;

  /** Puesto o cargo. Columna `job_title`: `position` es reservada en SQL. */
  @Column({ name: 'job_title', type: 'varchar', length: 120, nullable: true })
  jobTitle?: string | null;

  /** URL absoluta de la foto (almacenamiento público local, ver T23). */
  @Column({ name: 'photo_url', type: 'varchar', length: 500, nullable: true })
  photoUrl?: string | null;
}
