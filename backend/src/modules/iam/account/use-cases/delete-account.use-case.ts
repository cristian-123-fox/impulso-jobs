import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { Role } from '@/common/types/role.enum';
import { TokenType } from '@/common/types/token-type.enum';
import { UserStatus } from '@/common/types/user-status.enum';
import { comparePassword } from '@/common/utils/password.util';
import { runInTransaction } from '@/common/utils/transaction.util';
import { AuditService } from '@/modules/audit/audit.service';
import {
  type ICandidateProfileRepository,
  CANDIDATE_PROFILE_REPOSITORY,
} from '@/modules/candidates/repositories/candidate-profile.repository.interface';
import { CompanyMemberRole } from '@/modules/companies/enums/company-member-role.enum';
import {
  type ICompanyUserRepository,
  COMPANY_USER_REPOSITORY,
} from '@/modules/companies/repositories/company-user.repository.interface';
import {
  type IBlacklistTokenRepository,
  BLACKLIST_TOKEN_REPOSITORY,
} from '@/modules/iam/users/repositories/blacklist-token.repository.interface';
import {
  type ITokenUserRepository,
  TOKEN_USER_REPOSITORY,
} from '@/modules/iam/users/repositories/token-user.repository.interface';
import {
  type IUserRepository,
  USER_REPOSITORY,
} from '@/modules/iam/users/repositories/user.repository.interface';

export interface DeleteAccountCommand {
  userId: string;
  /** Contraseña actual: re-autenticación antes de una acción irreversible. */
  password: string;
  /** jti del access token con el que se pide la baja, para revocarlo. */
  accessJti?: string;
  ip: string;
  userAgent: string;
}

/**
 * Baja de la propia cuenta — derecho de **Cancelación** (ARCO / LFPDPPP).
 *
 * Qué hace:
 * - Borrado **lógico** del usuario y, si es aspirante, de su perfil. Deja de
 *   aparecer en búsquedas y no puede iniciar sesión (toda consulta excluye las
 *   filas borradas).
 * - Invalida **todas** las sesiones: `tokens_valid_from`, revocación de los
 *   refresh y blacklist del access presentado.
 * - Sale de los equipos de empresa a los que pertenezca.
 * - **Conserva** postulaciones, vacantes e historial: son registro histórico de
 *   la otra parte. La empresa los seguirá viendo, pero sin los datos del
 *   candidato (el perfil ya no se resuelve).
 *
 * Qué NO hace: borrado físico. Eso ocurre tras el periodo de retención, con
 * `pnpm purge:accounts` (ver `ACCOUNT_RETENTION_DAYS`).
 */
@Injectable()
export class DeleteAccountUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(CANDIDATE_PROFILE_REPOSITORY)
    private readonly profiles: ICandidateProfileRepository,
    @Inject(COMPANY_USER_REPOSITORY)
    private readonly members: ICompanyUserRepository,
    @Inject(TOKEN_USER_REPOSITORY)
    private readonly tokens: ITokenUserRepository,
    @Inject(BLACKLIST_TOKEN_REPOSITORY)
    private readonly blacklist: IBlacklistTokenRepository,
    private readonly audit: AuditService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async execute(command: DeleteAccountCommand): Promise<void> {
    const user = await this.users.findById(command.userId);
    if (!user) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.USER_NOT_FOUND,
        'El usuario no existe.',
      );
    }

    // Re-autenticación: una baja no debe poder dispararse con un token robado.
    const validPassword = await comparePassword(
      command.password,
      user.passwordHash,
    );
    if (!validPassword) {
      throw new AppException(
        HttpStatus.UNAUTHORIZED,
        ErrorCode.AUTH_INVALID_CREDENTIALS,
        'La contraseña no es correcta.',
      );
    }

    await this.assertNotLastAdmin(user.role);
    const membership = await this.members.findByUserId(user.id);
    if (membership) {
      await this.assertNotLastOwner(membership.companyId, membership.role);
    }

    user.tokensValidFrom = new Date();

    await runInTransaction(this.dataSource, async (manager) => {
      await this.users.save(user, manager);
      await this.tokens.revokeAllByUserId(user.id, manager);
      await this.blacklistAccess(command.accessJti, manager);

      // La membresía se borra de verdad: el índice único (company_id, user_id)
      // impediría volver a dar de alta a esa persona si quedara la fila.
      if (membership) {
        await this.members.remove(membership.companyId, user.id, manager);
      }

      await this.profiles.softDeleteByUserId(user.id, manager);
      await this.users.softDelete(user.id, manager);

      await this.audit.record(
        {
          action: 'account.delete',
          actorUserId: user.id,
          entity: 'user',
          entityId: user.id,
          ip: command.ip,
          userAgent: command.userAgent,
          metadata: {
            email: user.email,
            role: user.role,
            selfService: true,
            leftCompanyId: membership?.companyId ?? null,
          },
        },
        manager,
      );
    });
  }

  /**
   * Una plataforma sin administradores activos queda sin gobierno y sin forma
   * de restaurar nada. Mismo espíritu que el último OWNER de una empresa.
   */
  private async assertNotLastAdmin(role: Role): Promise<void> {
    if (role !== Role.ADMIN) return;
    const activeAdmins = await this.users.countBy({
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    });
    if (activeAdmins <= 1) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.ACCOUNT_LAST_ADMIN,
        'Eres el único administrador activo. Asigna otro antes de dar de baja tu cuenta.',
      );
    }
  }

  /** Toda empresa conserva al menos un OWNER (regla de M9). */
  private async assertNotLastOwner(
    companyId: string,
    memberRole: CompanyMemberRole,
  ): Promise<void> {
    if (memberRole !== CompanyMemberRole.OWNER) return;
    const owners = await this.members.countByRole(
      companyId,
      CompanyMemberRole.OWNER,
    );
    if (owners <= 1) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.COMPANY_LAST_OWNER,
        'Eres el único titular de tu empresa. Transfiere la titularidad antes de dar de baja tu cuenta.',
      );
    }
  }

  private async blacklistAccess(
    accessJti: string | undefined,
    manager: EntityManager,
  ): Promise<void> {
    if (!accessJti) return;
    if (await this.blacklist.existsByJti(accessJti, manager)) return;
    await this.blacklist.add(
      { jti: accessJti, tokenType: TokenType.ACCESS, reason: 'account.delete' },
      manager,
    );
  }
}
