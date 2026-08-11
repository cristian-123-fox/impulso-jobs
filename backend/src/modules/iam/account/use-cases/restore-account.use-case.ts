import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { runInTransaction } from '@/common/utils/transaction.util';
import { AuditService } from '@/modules/audit/audit.service';
import {
  type ICandidateProfileRepository,
  CANDIDATE_PROFILE_REPOSITORY,
} from '@/modules/candidates/repositories/candidate-profile.repository.interface';
import {
  type IUserRepository,
  USER_REPOSITORY,
} from '@/modules/iam/users/repositories/user.repository.interface';

export interface RestoreAccountCommand {
  id: string;
  actorUserId: string;
  ip: string;
  userAgent: string;
}

/**
 * Reactiva una cuenta dada de baja (sólo ADMIN). Devuelve el usuario y, si
 * existía, su perfil de aspirante.
 *
 * **No repone la membresía de empresa**: al darse de baja, la persona sale del
 * equipo y su fila se borra físicamente (el índice único de `company_users`
 * impide conservarla). Si debe volver al equipo, hay que invitarla de nuevo.
 */
@Injectable()
export class RestoreAccountUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(CANDIDATE_PROFILE_REPOSITORY)
    private readonly profiles: ICandidateProfileRepository,
    private readonly audit: AuditService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async execute(command: RestoreAccountCommand): Promise<void> {
    const user = await this.users.findByIdIncludingDeleted(command.id);
    if (!user) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.USER_NOT_FOUND,
        'El usuario no existe.',
      );
    }
    if (!user.deletedAt) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.ACCOUNT_NOT_DELETED,
        'La cuenta no está dada de baja.',
      );
    }

    await runInTransaction(this.dataSource, async (manager) => {
      await this.users.restore(user.id, manager);
      await this.profiles.restoreByUserId(user.id, manager);

      await this.audit.record(
        {
          action: 'account.restore',
          actorUserId: command.actorUserId,
          entity: 'user',
          entityId: user.id,
          ip: command.ip,
          userAgent: command.userAgent,
          metadata: {
            email: user.email,
            deletedAt: user.deletedAt?.toISOString() ?? null,
          },
        },
        manager,
      );
    });
  }
}
