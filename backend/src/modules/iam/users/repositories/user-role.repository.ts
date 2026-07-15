import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { UserRole } from '@/modules/iam/users/entities/user-role.entity';
import { IUserRoleRepository } from '@/modules/iam/users/repositories/user-role.repository.interface';

@Injectable()
export class UserRoleRepository
  extends BaseRepository<UserRole>
  implements IUserRoleRepository
{
  constructor(@InjectRepository(UserRole) repo: Repository<UserRole>) {
    super(repo);
  }

  async findRoleIdsByUserId(userId: string): Promise<string[]> {
    const rows = await this.repo().find({ where: { userId } });
    return rows.map((r) => r.roleId);
  }

  async exists(userId: string, roleId: string): Promise<boolean> {
    return (await this.repo().count({ where: { userId, roleId } })) > 0;
  }

  async add(
    userId: string,
    roleId: string,
    manager?: EntityManager,
  ): Promise<void> {
    const repo = this.repo(manager);
    await repo.save(repo.create({ userId, roleId }));
  }

  async remove(
    userId: string,
    roleId: string,
    manager?: EntityManager,
  ): Promise<void> {
    await this.repo(manager).delete({ userId, roleId });
  }
}
