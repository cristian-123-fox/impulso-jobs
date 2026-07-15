import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { Permission } from '@/modules/iam/permissions/entities/permission.entity';
import { IPermissionRepository } from '@/modules/iam/permissions/repositories/permission.repository.interface';

@Injectable()
export class PermissionRepository
  extends BaseRepository<Permission>
  implements IPermissionRepository
{
  constructor(@InjectRepository(Permission) repo: Repository<Permission>) {
    super(repo);
  }

  findAll(): Promise<Permission[]> {
    return this.repo().find({ order: { code: 'ASC' } });
  }

  findById(id: string): Promise<Permission | null> {
    return this.repo().findOne({ where: { id } });
  }

  findByIds(ids: string[]): Promise<Permission[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.repo().find({ where: { id: In(ids) } });
  }
}
