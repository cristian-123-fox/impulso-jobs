import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Not, Repository } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { Role } from '@/modules/iam/roles/entities/role.entity';
import { IRoleRepository } from '@/modules/iam/roles/repositories/role.repository.interface';

@Injectable()
export class RoleRepository
  extends BaseRepository<Role>
  implements IRoleRepository
{
  constructor(@InjectRepository(Role) repo: Repository<Role>) {
    super(repo);
  }

  findAll(): Promise<Role[]> {
    return this.repo().find({ order: { name: 'ASC' } });
  }

  findById(id: string): Promise<Role | null> {
    return this.repo().findOne({ where: { id } });
  }

  findByCode(code: string): Promise<Role | null> {
    return this.repo().findOne({ where: { code } });
  }

  findByIds(ids: string[]): Promise<Role[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.repo().find({ where: { id: In(ids) } });
  }

  async existsByCode(code: string, exceptId?: string): Promise<boolean> {
    const where = exceptId ? { code, id: Not(exceptId) } : { code };
    return (await this.repo().count({ where })) > 0;
  }

  save(role: Role, manager?: EntityManager): Promise<Role> {
    return this.repo(manager).save(role);
  }
}
