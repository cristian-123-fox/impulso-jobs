import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { Role } from '@/modules/iam/roles/entities/role.entity';
import {
  type IRoleRepository,
  ROLE_REPOSITORY,
} from '@/modules/iam/roles/repositories/role.repository.interface';

export interface UpdateRoleCommand {
  id: string;
  name?: string;
  description?: string;
  actorUserId: string;
  ip: string;
  userAgent: string;
}

@Injectable()
export class UpdateRoleUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roles: IRoleRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(command: UpdateRoleCommand): Promise<Role> {
    const role = await this.roles.findById(command.id);
    if (!role) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.ROLE_NOT_FOUND,
        'Rol no encontrado.',
      );
    }

    if (command.name !== undefined) role.name = command.name.trim();
    if (command.description !== undefined) {
      role.description = command.description.trim() || null;
    }
    const saved = await this.roles.save(role);

    await this.audit.record({
      action: 'roles.update',
      actorUserId: command.actorUserId,
      entity: 'role',
      entityId: saved.id,
      ip: command.ip,
      userAgent: command.userAgent,
    });
    return saved;
  }
}
