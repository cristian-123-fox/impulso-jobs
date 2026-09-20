import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { RoleScope } from '@/common/types/role-scope.enum';
import { Role } from '@/modules/iam/roles/entities/role.entity';
import {
  IRoleScopeRepository,
  RoleScopeRow,
} from '@/modules/iam/permissions/repositories/role-scope.repository.interface';

@Injectable()
export class RoleScopeRepository
  extends BaseRepository<Role>
  implements IRoleScopeRepository
{
  constructor(@InjectRepository(Role) repo: Repository<Role>) {
    super(repo);
  }

  async findAll(): Promise<RoleScopeRow[]> {
    const rows = await this.repo().find({
      select: { id: true, code: true, scope: true, isSystem: true },
    });
    return rows.map((row) => ({
      id: row.id,
      code: row.code,
      // Un rol sembrado antes de la migración podría no tener ámbito: se trata
      // como plataforma, que es el default de la columna.
      scope: row.scope ?? RoleScope.PLATFORM,
      isSystem: row.isSystem,
    }));
  }
}
