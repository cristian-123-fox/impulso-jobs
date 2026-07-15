import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@/modules/iam/users/entities/user.entity';
import { TokenUser } from '@/modules/iam/users/entities/token-user.entity';
import { BlacklistToken } from '@/modules/iam/users/entities/blacklist-token.entity';
import { USER_REPOSITORY } from '@/modules/iam/users/repositories/user.repository.interface';
import { UserRepository } from '@/modules/iam/users/repositories/user.repository';
import { TOKEN_USER_REPOSITORY } from '@/modules/iam/users/repositories/token-user.repository.interface';
import { TokenUserRepository } from '@/modules/iam/users/repositories/token-user.repository';
import { BLACKLIST_TOKEN_REPOSITORY } from '@/modules/iam/users/repositories/blacklist-token.repository.interface';
import { BlacklistTokenRepository } from '@/modules/iam/users/repositories/blacklist-token.repository';

/** Módulo raíz de identidad: usuarios, refresh tokens y blacklist. */
@Module({
  imports: [TypeOrmModule.forFeature([User, TokenUser, BlacklistToken])],
  providers: [
    { provide: USER_REPOSITORY, useClass: UserRepository },
    { provide: TOKEN_USER_REPOSITORY, useClass: TokenUserRepository },
    { provide: BLACKLIST_TOKEN_REPOSITORY, useClass: BlacklistTokenRepository },
  ],
  exports: [USER_REPOSITORY, TOKEN_USER_REPOSITORY, BLACKLIST_TOKEN_REPOSITORY],
})
export class UsersModule {}
