import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocalPublicFileStorageAdapter } from '@/common/storage/local-public-file-storage.adapter';
import { PUBLIC_FILE_STORAGE } from '@/common/storage/public-file-storage.port';
import { AuditModule } from '@/modules/audit/audit.module';
import { AdminCompaniesController } from '@/modules/companies/controllers/admin-companies.controller';
import { CompanyProfileController } from '@/modules/companies/controllers/company-profile.controller';
import { CompanyTeamController } from '@/modules/companies/controllers/company-team.controller';
import { Company } from '@/modules/companies/entities/company.entity';
import { CompanyUser } from '@/modules/companies/entities/company-user.entity';
import { COMPANY_REPOSITORY } from '@/modules/companies/repositories/company.repository.interface';
import { CompanyRepository } from '@/modules/companies/repositories/company.repository';
import { COMPANY_USER_REPOSITORY } from '@/modules/companies/repositories/company-user.repository.interface';
import { CompanyUserRepository } from '@/modules/companies/repositories/company-user.repository';
import { AdminCompaniesUseCase } from '@/modules/companies/use-cases/admin-companies.use-case';
import { CompanyMembersUseCase } from '@/modules/companies/use-cases/company-members.use-case';
import { CompanyProfileUseCase } from '@/modules/companies/use-cases/company-profile.use-case';
import { AuthModule } from '@/modules/iam/auth/auth.module';
import { PermissionsModule } from '@/modules/iam/permissions/permissions.module';
import { RolesModule } from '@/modules/iam/roles/roles.module';
import { UsersModule } from '@/modules/iam/users/users.module';

/** Dominio de empresas: entidad, membresías, perfil corporativo (M9) y repos. */
@Module({
  imports: [
    TypeOrmModule.forFeature([Company, CompanyUser]),
    AuditModule,
    AuthModule,
    PermissionsModule,
    RolesModule,
    UsersModule,
  ],
  controllers: [
    CompanyProfileController,
    CompanyTeamController,
    AdminCompaniesController,
  ],
  providers: [
    { provide: COMPANY_REPOSITORY, useClass: CompanyRepository },
    { provide: COMPANY_USER_REPOSITORY, useClass: CompanyUserRepository },
    // Logo en disco local (decisión cPanel). Migrar a S3 = cambiar este
    // useClass, mismo patrón que MAILER_PORT / PAYMENT_PROVIDER.
    { provide: PUBLIC_FILE_STORAGE, useClass: LocalPublicFileStorageAdapter },
    CompanyProfileUseCase,
    AdminCompaniesUseCase,
    CompanyMembersUseCase,
  ],
  exports: [COMPANY_REPOSITORY, COMPANY_USER_REPOSITORY],
})
export class CompaniesModule {}
