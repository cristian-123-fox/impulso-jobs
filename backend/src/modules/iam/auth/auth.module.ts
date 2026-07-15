import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuditModule } from '@/modules/audit/audit.module';
import { UsersModule } from '@/modules/iam/users/users.module';
import { AuthController } from '@/modules/iam/auth/controllers/auth.controller';
import { PasswordHasherService } from '@/modules/iam/auth/services/password-hasher.service';
import { TokenService } from '@/modules/iam/auth/services/token.service';
import { JwtStrategy } from '@/modules/iam/auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '@/modules/iam/auth/guards/jwt-auth.guard';
import { LoginUseCase } from '@/modules/iam/auth/use-cases/login.use-case';
import { RefreshTokenUseCase } from '@/modules/iam/auth/use-cases/refresh-token.use-case';
import { LogoutUseCase } from '@/modules/iam/auth/use-cases/logout.use-case';

@Module({
  imports: [PassportModule, JwtModule.register({}), UsersModule, AuditModule],
  controllers: [AuthController],
  providers: [
    PasswordHasherService,
    TokenService,
    JwtStrategy,
    JwtAuthGuard,
    LoginUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
  ],
  exports: [JwtAuthGuard],
})
export class AuthModule {}
