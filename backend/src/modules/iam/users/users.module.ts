import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@/modules/iam/users/entities/user.entity';
import { TokenUser } from '@/modules/iam/users/entities/token-user.entity';
import { BlacklistToken } from '@/modules/iam/users/entities/blacklist-token.entity';
import { UserRole } from '@/modules/iam/users/entities/user-role.entity';
import { USER_REPOSITORY } from '@/modules/iam/users/repositories/user.repository.interface';
import { UserRepository } from '@/modules/iam/users/repositories/user.repository';
import { TOKEN_USER_REPOSITORY } from '@/modules/iam/users/repositories/token-user.repository.interface';
import { TokenUserRepository } from '@/modules/iam/users/repositories/token-user.repository';
import { BLACKLIST_TOKEN_REPOSITORY } from '@/modules/iam/users/repositories/blacklist-token.repository.interface';
import { BlacklistTokenRepository } from '@/modules/iam/users/repositories/blacklist-token.repository';
import { USER_ROLE_REPOSITORY } from '@/modules/iam/users/repositories/user-role.repository.interface';
import { UserRoleRepository } from '@/modules/iam/users/repositories/user-role.repository';

/** Módulo raíz de identidad: usuarios, roles asignados, refresh tokens y blacklist. */
@Module({
  imports: [
    TypeOrmModule.forFeature([User, TokenUser, BlacklistToken, UserRole]),
  ],
  providers: [
    { provide: USER_REPOSITORY, useClass: UserRepository },
    { provide: TOKEN_USER_REPOSITORY, useClass: TokenUserRepository },
    { provide: BLACKLIST_TOKEN_REPOSITORY, useClass: BlacklistTokenRepository },
    { provide: USER_ROLE_REPOSITORY, useClass: UserRoleRepository },
  ],
  exports: [
    USER_REPOSITORY,
    TOKEN_USER_REPOSITORY,
    BLACKLIST_TOKEN_REPOSITORY,
    USER_ROLE_REPOSITORY,
  ],
})
export class UsersModule {}
