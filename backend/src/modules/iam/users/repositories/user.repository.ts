import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityManager,
  FindOptionsWhere,
  In,
  IsNull,
  Not,
  Repository,
} from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { containsInsensitive } from '@/common/utils/search.util';
import { Role } from '@/common/types/role.enum';
import { UserStatus } from '@/common/types/user-status.enum';
import { User } from '@/modules/iam/users/entities/user.entity';
import {
  IUserRepository,
  UserSearchCriteria,
} from '@/modules/iam/users/repositories/user.repository.interface';

@Injectable()
export class UserRepository
  extends BaseRepository<User>
  implements IUserRepository
{
  constructor(@InjectRepository(User) repo: Repository<User>) {
    super(repo);
  }

  findByEmail(email: string, manager?: EntityManager): Promise<User | null> {
    return this.repo(manager).findOne({
      where: { email: email.toLowerCase() },
    });
  }

  findById(id: string, manager?: EntityManager): Promise<User | null> {
    return this.repo(manager).findOne({ where: { id } });
  }

  findByIds(ids: string[], manager?: EntityManager): Promise<User[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.repo(manager).find({ where: { id: In(ids) } });
  }

  save(user: User, manager?: EntityManager): Promise<User> {
    return this.repo(manager).save(user);
  }

  findAndCount(
    criteria: UserSearchCriteria,
    manager?: EntityManager,
  ): Promise<[User[], number]> {
    return this.repo(manager).findAndCount({
      where: this.buildWhere(criteria),
      order: { createdAt: 'DESC' },
      skip: (criteria.page - 1) * criteria.limit,
      take: criteria.limit,
    });
  }

  countBy(
    where: { role?: Role; status?: UserStatus },
    manager?: EntityManager,
  ): Promise<number> {
    return this.repo(manager).count({ where });
  }

  async softDelete(id: string, manager?: EntityManager): Promise<void> {
    await this.repo(manager).softDelete({ id });
  }

  private buildWhere(criteria: UserSearchCriteria): FindOptionsWhere<User> {
    const where: FindOptionsWhere<User> = {};
    const search = criteria.search?.trim();
    if (search) where.email = containsInsensitive(search, 'searchEmail');
    if (criteria.role) where.role = criteria.role;
    if (criteria.status) where.status = criteria.status;
    if (criteria.emailVerified === true) where.emailVerifiedAt = Not(IsNull());
    if (criteria.emailVerified === false) where.emailVerifiedAt = IsNull();
    return where;
  }
}
