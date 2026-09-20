import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { Permission } from '@/modules/iam/permissions/entities/permission.entity';
import { RolePermission } from '@/modules/iam/permissions/entities/role-permission.entity';
import {
  IRolePermissionRepository,
  RolePermissionCode,
} from '@/modules/iam/permissions/repositories/role-permission.repository.interface';

@Injectable()
export class RolePermissionRepository
  extends BaseRepository<RolePermission>
  implements IRolePermissionRepository
{
  constructor(
    @InjectRepository(RolePermission) repo: Repository<RolePermission>,
  ) {
    super(repo);
  }

  findRolePermissionCodes(): Promise<RolePermissionCode[]> {
    return this.repo()
      .createQueryBuilder('rp')
      .innerJoin(Permission, 'p', 'p.id = rp.permission_id')
      .select('rp.role_id', 'roleId')
      .addSelect('p.code', 'code')
      .getRawMany<RolePermissionCode>();
  }

  async findPermissionIdsByRoleId(roleId: string): Promise<string[]> {
    const rows = await this.repo().find({ where: { roleId } });
    return rows.map((r) => r.permissionId);
  }

  async countByRole(): Promise<Map<string, number>> {
    const rows = await this.repo()
      .createQueryBuilder('rp')
      .select('rp.role_id', 'roleId')
      .addSelect('COUNT(*)', 'total')
      .groupBy('rp.role_id')
      .getRawMany<{ roleId: string; total: string | number }>();
    // MySQL devuelve COUNT(*) como número y PostgreSQL como cadena (bigint).
    return new Map(rows.map((row) => [row.roleId, Number(row.total)]));
  }

  async exists(roleId: string, permissionId: string): Promise<boolean> {
    return (await this.repo().count({ where: { roleId, permissionId } })) > 0;
  }

  async add(roleId: string, permissionId: string): Promise<void> {
    const repo = this.repo();
    await repo.save(repo.create({ roleId, permissionId }));
  }

  async addMany(
    roleId: string,
    permissionIds: readonly string[],
    manager?: EntityManager,
  ): Promise<void> {
    if (permissionIds.length === 0) return;
    const repo = this.repo(manager);
    await repo.save(
      permissionIds.map((permissionId) =>
        repo.create({ roleId, permissionId }),
      ),
    );
  }

  async remove(roleId: string, permissionId: string): Promise<void> {
    await this.repo().delete({ roleId, permissionId });
  }

  async removeMany(
    roleId: string,
    permissionIds: readonly string[],
    manager?: EntityManager,
  ): Promise<void> {
    if (permissionIds.length === 0) return;
    await this.repo(manager).delete({
      roleId,
      permissionId: In([...permissionIds]),
    });
  }

  async removeByRoleId(roleId: string, manager?: EntityManager): Promise<void> {
    await this.repo(manager).delete({ roleId });
  }
}
