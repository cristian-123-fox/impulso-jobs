import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { User } from '@/modules/iam/users/entities/user.entity';
import { IUserRepository } from '@/modules/iam/users/repositories/user.repository.interface';

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

  save(user: User, manager?: EntityManager): Promise<User> {
    return this.repo(manager).save(user);
  }
}
