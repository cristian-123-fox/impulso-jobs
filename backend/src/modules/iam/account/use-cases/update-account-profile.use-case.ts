import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { AuditService } from '@/modules/audit/audit.service';
import {
  AccountProfileDto,
  toAccountProfile,
} from '@/modules/iam/account/dto/account-profile.dto';
import {
  type IUserRepository,
  USER_REPOSITORY,
} from '@/modules/iam/users/repositories/user.repository.interface';

export interface UpdateAccountProfileCommand {
  userId: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  jobTitle?: string;
  ip: string;
  userAgent: string;
}

/**
 * Derecho de Rectificación sobre la identidad de la propia cuenta (`users`).
 *
 * Escribe **sólo en `users`**, nunca en el perfil del dominio. Consecuencia a
 * tener presente: para un CANDIDATE el nombre que se muestra sale de
 * `candidate_profiles` y para un EMPLOYER de `companies.business_name` (ver
 * `UserProfileResolver`), así que un candidato que rectificara aquí su nombre
 * no vería el cambio en ningún sitio. Por eso el frontend **no le ofrece los
 * campos de nombre** y lo manda a *Perfil del aspirante*, que es su origen
 * único — misma regla que ya aplica el modal de `/admin/usuarios`.
 *
 * Un campo ausente no se toca; un campo en blanco lo borra (queda `null`).
 */
@Injectable()
export class UpdateAccountProfileUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(
    command: UpdateAccountProfileCommand,
  ): Promise<AccountProfileDto> {
    const user = await this.users.findById(command.userId);
    if (!user) {
      throw new AppException(
        HttpStatus.UNAUTHORIZED,
        ErrorCode.UNAUTHORIZED,
        'No autorizado.',
      );
    }

    if (command.firstName !== undefined) {
      user.firstName = command.firstName.trim() || null;
    }
    if (command.lastName !== undefined) {
      user.lastName = command.lastName.trim() || null;
    }
    if (command.phone !== undefined) {
      user.phone = command.phone.trim() || null;
    }
    if (command.jobTitle !== undefined) {
      user.jobTitle = command.jobTitle.trim() || null;
    }

    const saved = await this.users.save(user);

    await this.audit.record({
      action: 'account.profile.update',
      actorUserId: saved.id,
      entity: 'user',
      entityId: saved.id,
      ip: command.ip,
      userAgent: command.userAgent,
    });

    return toAccountProfile(saved);
  }
}
