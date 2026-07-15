import { EntityManager } from 'typeorm';
import { BlacklistToken } from '@/modules/iam/users/entities/blacklist-token.entity';

export const BLACKLIST_TOKEN_REPOSITORY = 'BLACKLIST_TOKEN_REPOSITORY';

export interface IBlacklistTokenRepository {
  add(entry: Partial<BlacklistToken>, manager?: EntityManager): Promise<void>;
  existsByJti(jti: string, manager?: EntityManager): Promise<boolean>;
}
