import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { runInTransaction } from '@/common/utils/transaction.util';
import { AuditService } from '@/modules/audit/audit.service';
import {
  type IUserRepository,
  USER_REPOSITORY,
} from '@/modules/iam/users/repositories/user.repository.interface';

export interface DeleteUserCommand {
  id: string;
  actorUserId: string;
  ip: string;
  userAgent: string;
}

/**
 * Baja lógica de una cuenta (soft-delete): conserva la trazabilidad y las
 * referencias históricas. Invalida las sesiones vigentes.
 */
@Injectable()
export class DeleteUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    private readonly audit: AuditService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async execute(command: DeleteUserCommand): Promise<void> {
    const user = await this.users.findById(command.id);
    if (!user) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.USER_NOT_FOUND,
        'El usuario no existe.',
      );
    }
    if (user.id === command.actorUserId) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.CONFLICT,
        'No puedes eliminar tu propia cuenta desde el back-office.',
      );
    }

    user.tokensValidFrom = new Date();

    await runInTransaction(this.dataSource, async (manager) => {
      await this.users.save(user, manager);
      await this.users.softDelete(user.id, manager);
      await this.audit.record(
        {
          action: 'users.delete',
          actorUserId: command.actorUserId,
          entity: 'user',
          entityId: user.id,
          ip: command.ip,
          userAgent: command.userAgent,
          metadata: { email: user.email, role: user.role },
        },
        manager,
      );
    });
  }
}
