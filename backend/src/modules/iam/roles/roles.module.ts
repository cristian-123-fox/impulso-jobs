import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '@/modules/audit/audit.module';
import { AuthModule } from '@/modules/iam/auth/auth.module';
import { PermissionsModule } from '@/modules/iam/permissions/permissions.module';
import { UsersModule } from '@/modules/iam/users/users.module';
import { Role } from '@/modules/iam/roles/entities/role.entity';
import { ROLE_REPOSITORY } from '@/modules/iam/roles/repositories/role.repository.interface';
import { RoleRepository } from '@/modules/iam/roles/repositories/role.repository';
import { RolesController } from '@/modules/iam/roles/controllers/roles.controller';
import { UserRolesController } from '@/modules/iam/roles/controllers/user-roles.controller';
import { ListRolesUseCase } from '@/modules/iam/roles/use-cases/list-roles.use-case';
import { GetRoleUseCase } from '@/modules/iam/roles/use-cases/get-role.use-case';
import { CreateRoleUseCase } from '@/modules/iam/roles/use-cases/create-role.use-case';
import { UpdateRoleUseCase } from '@/modules/iam/roles/use-cases/update-role.use-case';
import { ListRolePermissionsUseCase } from '@/modules/iam/roles/use-cases/list-role-permissions.use-case';
import { AssignRolePermissionUseCase } from '@/modules/iam/roles/use-cases/assign-role-permission.use-case';
import { RemoveRolePermissionUseCase } from '@/modules/iam/roles/use-cases/remove-role-permission.use-case';
import { AssignUserRoleUseCase } from '@/modules/iam/roles/use-cases/assign-user-role.use-case';
import { RemoveUserRoleUseCase } from '@/modules/iam/roles/use-cases/remove-user-role.use-case';

@Module({
  imports: [
    TypeOrmModule.forFeature([Role]),
    AuthModule,
    PermissionsModule,
    UsersModule,
    AuditModule,
  ],
  controllers: [RolesController, UserRolesController],
  providers: [
    { provide: ROLE_REPOSITORY, useClass: RoleRepository },
    ListRolesUseCase,
    GetRoleUseCase,
    CreateRoleUseCase,
    UpdateRoleUseCase,
    ListRolePermissionsUseCase,
    AssignRolePermissionUseCase,
    RemoveRolePermissionUseCase,
    AssignUserRoleUseCase,
    RemoveUserRoleUseCase,
  ],
  exports: [ROLE_REPOSITORY],
})
export class RolesModule {}
