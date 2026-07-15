import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { TokenUser } from '@/modules/iam/users/entities/token-user.entity';
import { ITokenUserRepository } from '@/modules/iam/users/repositories/token-user.repository.interface';

@Injectable()
export class TokenUserRepository
  extends BaseRepository<TokenUser>
  implements ITokenUserRepository
{
  constructor(@InjectRepository(TokenUser) repo: Repository<TokenUser>) {
    super(repo);
  }

  create(
    data: Partial<TokenUser>,
    manager?: EntityManager,
  ): Promise<TokenUser> {
    const repo = this.repo(manager);
    return repo.save(repo.create(data));
  }

  findByJti(jti: string, manager?: EntityManager): Promise<TokenUser | null> {
    // `id` almacena el `jti` del refresh token.
    return this.repo(manager).findOne({ where: { id: jti } });
  }

  async revoke(jti: string, manager?: EntityManager): Promise<void> {
    await this.repo(manager).update({ id: jti }, { revoked: true });
  }

  async revokeAllByUserId(
    userId: string,
    manager?: EntityManager,
  ): Promise<void> {
    await this.repo(manager).update(
      { userId, revoked: false },
      { revoked: true },
    );
  }
}
