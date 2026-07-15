import { Module } from '@nestjs/common';
import { AuditModule } from '@/modules/audit/audit.module';
import { AuthModule } from '@/modules/iam/auth/auth.module';
import { UsersModule } from '@/modules/iam/users/users.module';
import { RolesModule } from '@/modules/iam/roles/roles.module';
import { CompaniesModule } from '@/modules/companies/companies.module';
import { CandidatesModule } from '@/modules/candidates/candidates.module';
import { RegisterController } from '@/modules/iam/registration/controllers/register.controller';
import { RegisterUseCase } from '@/modules/iam/registration/use-cases/register.use-case';

/**
 * Registro público (HU-005/006). Módulo propio para evitar el ciclo Auth↔Roles:
 * depende de Auth (hasher + verificación M4), Roles (ROLE_REPOSITORY), Users y
 * los dominios de empresas/candidatos.
 */
@Module({
  imports: [
    AuthModule,
    UsersModule,
    RolesModule,
    CompaniesModule,
    CandidatesModule,
    AuditModule,
  ],
  controllers: [RegisterController],
  providers: [RegisterUseCase],
})
export class RegistrationModule {}
