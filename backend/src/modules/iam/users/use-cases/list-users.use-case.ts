import { Inject, Injectable } from '@nestjs/common';
import {
  PaginatedResponse,
  toPaginated,
} from '@/common/dto/paginated-response.dto';
import { Role } from '@/common/types/role.enum';
import { UserStatus } from '@/common/types/user-status.enum';
import {
  UserResponseDto,
  toUserResponse,
} from '@/modules/iam/users/dto/user-response.dto';
import {
  type IUserRepository,
  USER_REPOSITORY,
  UserSearchCriteria,
} from '@/modules/iam/users/repositories/user.repository.interface';
import { UserProfileResolver } from '@/modules/iam/users/services/user-profile-resolver.service';

/** Totales por rol/estado para las tarjetas del listado. */
export interface UserStats {
  total: number;
  admins: number;
  employers: number;
  candidates: number;
  inactive: number;
}

export interface ListUsersResult extends PaginatedResponse<UserResponseDto> {
  stats: UserStats;
}

/** HU-admin: listado paginado y filtrable de cuentas de la plataforma. */
@Injectable()
export class ListUsersUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    private readonly profiles: UserProfileResolver,
  ) {}

  async execute(criteria: UserSearchCriteria): Promise<ListUsersResult> {
    const [rows, total] = await this.users.findAndCount(criteria);
    const profiles = await this.profiles.resolve(rows);
    const items = rows.map((user) =>
      toUserResponse(user, profiles.get(user.id) ?? {}),
    );

    const [all, admins, employers, candidates, inactive] = await Promise.all([
      this.users.countBy({}),
      this.users.countBy({ role: Role.ADMIN }),
      this.users.countBy({ role: Role.EMPLOYER }),
      this.users.countBy({ role: Role.CANDIDATE }),
      this.users.countBy({ status: UserStatus.INACTIVE }),
    ]);

    return {
      ...toPaginated(items, total, criteria.page, criteria.limit),
      stats: { total: all, admins, employers, candidates, inactive },
    };
  }
}
