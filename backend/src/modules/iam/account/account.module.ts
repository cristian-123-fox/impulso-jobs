import { Module } from '@nestjs/common';
import { ApplicationsModule } from '@/modules/applications/applications.module';
import { AuditModule } from '@/modules/audit/audit.module';
import { CandidatesModule } from '@/modules/candidates/candidates.module';
import { CompaniesModule } from '@/modules/companies/companies.module';
import { AccountController } from '@/modules/iam/account/controllers/account.controller';
import { DeleteAccountUseCase } from '@/modules/iam/account/use-cases/delete-account.use-case';
import { ExportAccountDataUseCase } from '@/modules/iam/account/use-cases/export-account-data.use-case';
import { RestoreAccountUseCase } from '@/modules/iam/account/use-cases/restore-account.use-case';
import { AuthModule } from '@/modules/iam/auth/auth.module';
import { PermissionsModule } from '@/modules/iam/permissions/permissions.module';
import { RolesModule } from '@/modules/iam/roles/roles.module';
import { UsersModule } from '@/modules/iam/users/users.module';
import { VacanciesModule } from '@/modules/vacancies/vacancies.module';

/**
 * M13: baja de cuenta y derechos ARCO.
 *
 * Módulo propio dentro de `iam/`, en paralelo a `registration/`: uno cubre el
 * alta de la cuenta y éste su baja y el export de datos. Es transversal por
 * naturaleza — para el export lee de candidates, companies, applications y
 * vacancies —, así que no cabía dentro de ninguno de ellos.
 */
@Module({
  imports: [
    AuditModule,
    AuthModule,
    PermissionsModule,
    UsersModule,
    RolesModule,
    CandidatesModule,
    CompaniesModule,
    ApplicationsModule,
    VacanciesModule,
  ],
  controllers: [AccountController],
  providers: [
    DeleteAccountUseCase,
    RestoreAccountUseCase,
    ExportAccountDataUseCase,
  ],
})
export class AccountModule {}
