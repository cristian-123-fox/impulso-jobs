import { Module } from '@nestjs/common';
import { LocalPublicFileStorageAdapter } from '@/common/storage/local-public-file-storage.adapter';
import { PUBLIC_FILE_STORAGE } from '@/common/storage/public-file-storage.port';
import { ApplicationsModule } from '@/modules/applications/applications.module';
import { AuditModule } from '@/modules/audit/audit.module';
import { CandidatesModule } from '@/modules/candidates/candidates.module';
import { CompaniesModule } from '@/modules/companies/companies.module';
import { AccountController } from '@/modules/iam/account/controllers/account.controller';
import { ChangePasswordUseCase } from '@/modules/iam/account/use-cases/change-password.use-case';
import { DeleteAccountUseCase } from '@/modules/iam/account/use-cases/delete-account.use-case';
import { ExportAccountDataUseCase } from '@/modules/iam/account/use-cases/export-account-data.use-case';
import { GetAccountProfileUseCase } from '@/modules/iam/account/use-cases/get-account-profile.use-case';
import { RestoreAccountUseCase } from '@/modules/iam/account/use-cases/restore-account.use-case';
import { UpdateAccountProfileUseCase } from '@/modules/iam/account/use-cases/update-account-profile.use-case';
import { AuthModule } from '@/modules/iam/auth/auth.module';
import { PermissionsModule } from '@/modules/iam/permissions/permissions.module';
import { RolesModule } from '@/modules/iam/roles/roles.module';
import { UpdateUserPhotoUseCase } from '@/modules/iam/users/use-cases/update-user-photo.use-case';
import { UsersModule } from '@/modules/iam/users/users.module';
import { VacanciesModule } from '@/modules/vacancies/vacancies.module';

/**
 * M13: baja de cuenta y derechos ARCO.
 *
 * Módulo propio dentro de `iam/`, en paralelo a `registration/`: uno cubre el
 * alta de la cuenta y éste su vida (identidad, contraseña, foto), su baja y el
 * export de datos. Es transversal por naturaleza — para el export lee de
 * candidates, companies, applications y vacancies —, así que no cabía dentro
 * de ninguno de ellos.
 *
 * `UpdateUserPhotoUseCase` se reusa de `users/` en vez de duplicar el flujo de
 * imagen (validación por magic bytes, guardar-luego-borrar). Se declara aquí
 * como proveedor, con su propio binding de `PUBLIC_FILE_STORAGE`, igual que
 * hacen `AdminUsersModule`, `CompaniesModule` y `CandidatesModule`.
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
    GetAccountProfileUseCase,
    UpdateAccountProfileUseCase,
    ChangePasswordUseCase,
    UpdateUserPhotoUseCase,
    { provide: PUBLIC_FILE_STORAGE, useClass: LocalPublicFileStorageAdapter },
  ],
})
export class AccountModule {}
