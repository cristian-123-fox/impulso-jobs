import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '@/modules/iam/auth/auth.module';
import { Component } from '@/modules/iam/permissions/entities/component.entity';
import { Action } from '@/modules/iam/permissions/entities/action.entity';
import { Permission } from '@/modules/iam/permissions/entities/permission.entity';
import { RolePermission } from '@/modules/iam/permissions/entities/role-permission.entity';
import { PERMISSION_REPOSITORY } from '@/modules/iam/permissions/repositories/permission.repository.interface';
import { PermissionRepository } from '@/modules/iam/permissions/repositories/permission.repository';
import { ROLE_PERMISSION_REPOSITORY } from '@/modules/iam/permissions/repositories/role-permission.repository.interface';
import { RolePermissionRepository } from '@/modules/iam/permissions/repositories/role-permission.repository';
import { PermissionsService } from '@/modules/iam/permissions/services/permissions.service';
import { PermissionsGuard } from '@/modules/iam/permissions/guards/permissions.guard';
import { PermissionsController } from '@/modules/iam/permissions/controllers/permissions.controller';

/** Catálogo de permisos + resolución/guard de autorización reutilizable. */
@Module({
  imports: [
    TypeOrmModule.forFeature([Component, Action, Permission, RolePermission]),
    AuthModule,
  ],
  controllers: [PermissionsController],
  providers: [
    { provide: PERMISSION_REPOSITORY, useClass: PermissionRepository },
    { provide: ROLE_PERMISSION_REPOSITORY, useClass: RolePermissionRepository },
    PermissionsService,
    PermissionsGuard,
  ],
  exports: [
    PermissionsService,
    PermissionsGuard,
    PERMISSION_REPOSITORY,
    ROLE_PERMISSION_REPOSITORY,
  ],
})
export class PermissionsModule {}
