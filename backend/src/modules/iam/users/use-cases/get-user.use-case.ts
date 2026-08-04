import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import {
  UserResponseDto,
  toUserResponse,
} from '@/modules/iam/users/dto/user-response.dto';
import {
  type IUserRepository,
  USER_REPOSITORY,
} from '@/modules/iam/users/repositories/user.repository.interface';
import { UserProfileResolver } from '@/modules/iam/users/services/user-profile-resolver.service';

/** Detalle de una cuenta para el back-office. */
@Injectable()
export class GetUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    private readonly profiles: UserProfileResolver,
  ) {}

  async execute(id: string): Promise<UserResponseDto> {
    const user = await this.users.findById(id);
    if (!user) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.USER_NOT_FOUND,
        'El usuario no existe.',
      );
    }
    return toUserResponse(user, await this.profiles.resolveOne(user));
  }
}
