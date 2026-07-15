import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { Role } from '@/modules/iam/roles/entities/role.entity';
import {
  type IRoleRepository,
  ROLE_REPOSITORY,
} from '@/modules/iam/roles/repositories/role.repository.interface';

export interface CreateRoleCommand {
  code: string;
  name: string;
  description?: string;
  actorUserId: string;
  ip: string;
  userAgent: string;
}

@Injectable()
export class CreateRoleUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roles: IRoleRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(command: CreateRoleCommand): Promise<Role> {
    const code = command.code.trim().toUpperCase();
    if (await this.roles.existsByCode(code)) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.ROLE_ALREADY_EXISTS,
        'Ya existe un rol con ese código.',
      );
    }

    const role = new Role();
    role.code = code;
    role.name = command.name.trim();
    role.description = command.description?.trim() ?? null;
    role.isSystem = false;
    const saved = await this.roles.save(role);

    await this.audit.record({
      action: 'roles.create',
      actorUserId: command.actorUserId,
      entity: 'role',
      entityId: saved.id,
      ip: command.ip,
      userAgent: command.userAgent,
      metadata: { code: saved.code },
    });
    return saved;
  }
}
