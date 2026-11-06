import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import {
  ADMINISTRABLE_ROLE_SCOPES,
  RoleScope,
} from '@/common/types/role-scope.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { PermissionsService } from '@/modules/iam/permissions/services/permissions.service';
import { Role } from '@/modules/iam/roles/entities/role.entity';
import {
  type IRoleRepository,
  ROLE_REPOSITORY,
} from '@/modules/iam/roles/repositories/role.repository.interface';

export interface CreateRoleCommand {
  code: string;
  name: string;
  scope: RoleScope;
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
    private readonly permissionsService: PermissionsService,
  ) {}

  async execute(command: CreateRoleCommand): Promise<Role> {
    // El aspirante no tiene roles administrables: sus permisos están en código.
    if (!ADMINISTRABLE_ROLE_SCOPES.includes(command.scope)) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.VALIDATION_ERROR,
        'El ámbito del rol debe ser de plataforma o de empresa.',
      );
    }

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
    role.scope = command.scope;
    const saved = await this.roles.save(role);

    // El mapa rol→permisos vive en memoria. Un rol recién creado tiene que
    // entrar en él (aunque sólo sea con la base de su ámbito); si no se
    // invalida, sus permisos no aplican hasta reiniciar el proceso.
    this.permissionsService.invalidate();

    await this.audit.record({
      action: 'roles.create',
      actorUserId: command.actorUserId,
      entity: 'role',
      entityId: saved.id,
      ip: command.ip,
      userAgent: command.userAgent,
      metadata: { code: saved.code, scope: saved.scope },
    });
    return saved;
  }
}
