import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuditModule } from '@/modules/audit/audit.module';
import { UsersModule } from '@/modules/iam/users/users.module';
import { AuthController } from '@/modules/iam/auth/controllers/auth.controller';
import { PasswordResetController } from '@/modules/iam/auth/controllers/password-reset.controller';
import { PasswordHasherService } from '@/modules/iam/auth/services/password-hasher.service';
import { TokenService } from '@/modules/iam/auth/services/token.service';
import { MAILER_PORT } from '@/modules/iam/auth/services/mailer.port';
import { ConsoleMailerAdapter } from '@/modules/iam/auth/services/console-mailer.adapter';
import { JwtStrategy } from '@/modules/iam/auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '@/modules/iam/auth/guards/jwt-auth.guard';
import { LoginUseCase } from '@/modules/iam/auth/use-cases/login.use-case';
import { RefreshTokenUseCase } from '@/modules/iam/auth/use-cases/refresh-token.use-case';
import { LogoutUseCase } from '@/modules/iam/auth/use-cases/logout.use-case';
import { RequestPasswordResetUseCase } from '@/modules/iam/auth/use-cases/request-password-reset.use-case';
import { ValidatePasswordResetUseCase } from '@/modules/iam/auth/use-cases/validate-password-reset.use-case';
import { ConfirmPasswordResetUseCase } from '@/modules/iam/auth/use-cases/confirm-password-reset.use-case';

@Module({
  imports: [PassportModule, JwtModule.register({}), UsersModule, AuditModule],
  controllers: [AuthController, PasswordResetController],
  providers: [
    PasswordHasherService,
    TokenService,
    { provide: MAILER_PORT, useClass: ConsoleMailerAdapter },
    JwtStrategy,
    JwtAuthGuard,
    LoginUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    RequestPasswordResetUseCase,
    ValidatePasswordResetUseCase,
    ConfirmPasswordResetUseCase,
  ],
  exports: [JwtAuthGuard],
})
export class AuthModule {}
