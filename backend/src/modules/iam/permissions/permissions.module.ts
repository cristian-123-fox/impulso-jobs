import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '@/modules/iam/auth/auth.module';
import { Component } from '@/modules/iam/permissions/entities/component.entity';
import { Action } from '@/modules/iam/permissions/entities/action.entity';
import { Permission } from '@/modules/iam/permissions/entities/permission.entity';
import { RolePermission } from '@/modules/iam/permissions/entities/role-permission.entity';
import { Role } from '@/modules/iam/roles/entities/role.entity';
import { PERMISSION_REPOSITORY } from '@/modules/iam/permissions/repositories/permission.repository.interface';
import { PermissionRepository } from '@/modules/iam/permissions/repositories/permission.repository';
import { ROLE_PERMISSION_REPOSITORY } from '@/modules/iam/permissions/repositories/role-permission.repository.interface';
import { RolePermissionRepository } from '@/modules/iam/permissions/repositories/role-permission.repository';
import { ROLE_SCOPE_REPOSITORY } from '@/modules/iam/permissions/repositories/role-scope.repository.interface';
import { RoleScopeRepository } from '@/modules/iam/permissions/repositories/role-scope.repository';
import { PermissionsService } from '@/modules/iam/permissions/services/permissions.service';
import { PermissionsGuard } from '@/modules/iam/permissions/guards/permissions.guard';
import { RolesGuard } from '@/modules/iam/permissions/guards/roles.guard';
import { PermissionsController } from '@/modules/iam/permissions/controllers/permissions.controller';

/**
 * Catálogo de permisos + resolución/guard de autorización reutilizable.
 *
 * `Role` entra aquí como **entidad** (no como módulo) para que la autorización
 * pueda leer el ámbito del rol y aplicar `SCOPE_BASELINE`: `RolesModule` ya
 * importa este módulo, así que importarlo de vuelta cerraría un ciclo de DI.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Component,
      Action,
      Permission,
      RolePermission,
      Role,
    ]),
    AuthModule,
  ],
  controllers: [PermissionsController],
  providers: [
    { provide: PERMISSION_REPOSITORY, useClass: PermissionRepository },
    { provide: ROLE_PERMISSION_REPOSITORY, useClass: RolePermissionRepository },
    { provide: ROLE_SCOPE_REPOSITORY, useClass: RoleScopeRepository },
    PermissionsService,
    PermissionsGuard,
    RolesGuard,
  ],
  exports: [
    PermissionsService,
    PermissionsGuard,
    RolesGuard,
    PERMISSION_REPOSITORY,
    ROLE_PERMISSION_REPOSITORY,
    ROLE_SCOPE_REPOSITORY,
  ],
})
export class PermissionsModule {}
