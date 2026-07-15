import { EntityManager } from 'typeorm';
import { TokenUser } from '@/modules/iam/users/entities/token-user.entity';

export const TOKEN_USER_REPOSITORY = 'TOKEN_USER_REPOSITORY';

export interface ITokenUserRepository {
  create(data: Partial<TokenUser>, manager?: EntityManager): Promise<TokenUser>;
  findByJti(jti: string, manager?: EntityManager): Promise<TokenUser | null>;
  revoke(jti: string, manager?: EntityManager): Promise<void>;
  revokeAllByUserId(userId: string, manager?: EntityManager): Promise<void>;
}
