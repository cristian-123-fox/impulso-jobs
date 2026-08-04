import { Module } from '@nestjs/common';
import { AuditModule } from '@/modules/audit/audit.module';
import { CandidatesModule } from '@/modules/candidates/candidates.module';
import { CompaniesModule } from '@/modules/companies/companies.module';
import { AuthModule } from '@/modules/iam/auth/auth.module';
import { PermissionsModule } from '@/modules/iam/permissions/permissions.module';
import { RolesModule } from '@/modules/iam/roles/roles.module';
import { AdminUsersController } from '@/modules/iam/users/controllers/admin-users.controller';
import { UserProfileResolver } from '@/modules/iam/users/services/user-profile-resolver.service';
import { CreateUserUseCase } from '@/modules/iam/users/use-cases/create-user.use-case';
import { DeleteUserUseCase } from '@/modules/iam/users/use-cases/delete-user.use-case';
import { GetUserUseCase } from '@/modules/iam/users/use-cases/get-user.use-case';
import { ListUsersUseCase } from '@/modules/iam/users/use-cases/list-users.use-case';
import { UpdateUserUseCase } from '@/modules/iam/users/use-cases/update-user.use-case';
import { UsersModule } from '@/modules/iam/users/users.module';

/**
 * Back-office de cuentas (`/admin/users`). Vive en un módulo aparte de
 * `UsersModule` — que sólo expone repositorios — para que los dominios que
 * dependen de él (companies, candidates) no formen un ciclo con este.
 */
@Module({
  imports: [
    UsersModule,
    RolesModule,
    AuthModule,
    PermissionsModule,
    AuditModule,
    CompaniesModule,
    CandidatesModule,
  ],
  controllers: [AdminUsersController],
  providers: [
    UserProfileResolver,
    ListUsersUseCase,
    GetUserUseCase,
    CreateUserUseCase,
    UpdateUserUseCase,
    DeleteUserUseCase,
  ],
})
export class AdminUsersModule {}
