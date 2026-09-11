import { Module } from '@nestjs/common';
import { CandidatesModule } from '@/modules/candidates/candidates.module';
import { CompaniesModule } from '@/modules/companies/companies.module';
import { AuthModule } from '@/modules/iam/auth/auth.module';
import { SessionController } from '@/modules/iam/session/controllers/session.controller';
import { GetCurrentUserUseCase } from '@/modules/iam/session/use-cases/get-current-user.use-case';
import { UsersModule } from '@/modules/iam/users/users.module';

/**
 * T27: identidad de la sesión activa (`GET /auth/me`).
 *
 * Módulo propio dentro de `iam/`, en paralelo a `registration/` y `account/`:
 * necesita leer el perfil del candidato y el de la empresa, y esos dominios
 * importan `AuthModule`, así que el endpoint no cabe dentro de él sin ciclo.
 */
@Module({
  imports: [AuthModule, UsersModule, CandidatesModule, CompaniesModule],
  controllers: [SessionController],
  providers: [GetCurrentUserUseCase],
})
export class SessionModule {}
