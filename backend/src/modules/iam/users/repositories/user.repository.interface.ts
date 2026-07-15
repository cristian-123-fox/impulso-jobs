import { EntityManager } from 'typeorm';
import { User } from '@/modules/iam/users/entities/user.entity';

export const USER_REPOSITORY = 'USER_REPOSITORY';

export interface IUserRepository {
  findByEmail(email: string, manager?: EntityManager): Promise<User | null>;
  findById(id: string, manager?: EntityManager): Promise<User | null>;
  save(user: User, manager?: EntityManager): Promise<User>;
}
