import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import {
  AccountProfileDto,
  toAccountProfile,
} from '@/modules/iam/account/dto/account-profile.dto';
import {
  type IUserRepository,
  USER_REPOSITORY,
} from '@/modules/iam/users/repositories/user.repository.interface';

/**
 * Derecho de Acceso a escala de formulario: la propia fila de `users`.
 *
 * Se lee del repositorio y no del JWT porque el token se emitió al iniciar
 * sesión y no refleja un cambio posterior — mismo motivo que `GET /auth/me`.
 */
@Injectable()
export class GetAccountProfileUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
  ) {}

  async execute(userId: string): Promise<AccountProfileDto> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new AppException(
        HttpStatus.UNAUTHORIZED,
        ErrorCode.UNAUTHORIZED,
        'No autorizado.',
      );
    }
    return toAccountProfile(user);
  }
}
