import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { BlacklistToken } from '@/modules/iam/users/entities/blacklist-token.entity';
import { IBlacklistTokenRepository } from '@/modules/iam/users/repositories/blacklist-token.repository.interface';

@Injectable()
export class BlacklistTokenRepository
  extends BaseRepository<BlacklistToken>
  implements IBlacklistTokenRepository
{
  constructor(
    @InjectRepository(BlacklistToken) repo: Repository<BlacklistToken>,
  ) {
    super(repo);
  }

  async add(
    entry: Partial<BlacklistToken>,
    manager?: EntityManager,
  ): Promise<void> {
    const repo = this.repo(manager);
    await repo.save(repo.create(entry));
  }

  async existsByJti(jti: string, manager?: EntityManager): Promise<boolean> {
    const count = await this.repo(manager).count({ where: { jti } });
    return count > 0;
  }
}
