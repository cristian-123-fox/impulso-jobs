import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocalPublicFileStorageAdapter } from '@/common/storage/local-public-file-storage.adapter';
import { PUBLIC_FILE_STORAGE } from '@/common/storage/public-file-storage.port';
import { CompanySubscription } from '@/modules/billing/entities/company-subscription.entity';
import { Plan } from '@/modules/billing/entities/plan.entity';
import { AuditModule } from '@/modules/audit/audit.module';
import { AdminCompaniesController } from '@/modules/companies/controllers/admin-companies.controller';
import { CompanyProfileController } from '@/modules/companies/controllers/company-profile.controller';
import { CompanyRolesController } from '@/modules/companies/controllers/company-roles.controller';
import { CompanyTeamController } from '@/modules/companies/controllers/company-team.controller';
import { Company } from '@/modules/companies/entities/company.entity';
import { CompanyUser } from '@/modules/companies/entities/company-user.entity';
import { COMPANY_PLAN_REPOSITORY } from '@/modules/companies/repositories/company-plan.repository.interface';
import { CompanyPlanRepository } from '@/modules/companies/repositories/company-plan.repository';
import { COMPANY_REPOSITORY } from '@/modules/companies/repositories/company.repository.interface';
import { CompanyRepository } from '@/modules/companies/repositories/company.repository';
import { COMPANY_USER_REPOSITORY } from '@/modules/companies/repositories/company-user.repository.interface';
import { CompanyUserRepository } from '@/modules/companies/repositories/company-user.repository';
import { AdminCompaniesUseCase } from '@/modules/companies/use-cases/admin-companies.use-case';
import { CompanyRolesUseCase } from '@/modules/companies/use-cases/company-roles.use-case';
import { CompanyMembersUseCase } from '@/modules/companies/use-cases/company-members.use-case';
import { CompanyProfileUseCase } from '@/modules/companies/use-cases/company-profile.use-case';
import { AuthModule } from '@/modules/iam/auth/auth.module';
import { PermissionsModule } from '@/modules/iam/permissions/permissions.module';
import { RolesModule } from '@/modules/iam/roles/roles.module';
import { UsersModule } from '@/modules/iam/users/users.module';

/** Dominio de empresas: entidad, membresías, perfil corporativo (M9) y repos. */
@Module({
  imports: [
    // Las dos entidades de billing son **sólo lectura**: el listado del
    // back-office muestra el plan de cada empresa (T34) y no puede pedírselo a
    // BillingModule, que ya importa este módulo. Importar la clase de entidad
    // no crea ciclo; importar el módulo sí.
    TypeOrmModule.forFeature([Company, CompanyUser, CompanySubscription, Plan]),
    AuditModule,
    AuthModule,
    PermissionsModule,
    RolesModule,
    UsersModule,
  ],
  controllers: [
    CompanyProfileController,
    CompanyTeamController,
    CompanyRolesController,
    AdminCompaniesController,
  ],
  providers: [
    { provide: COMPANY_REPOSITORY, useClass: CompanyRepository },
    { provide: COMPANY_USER_REPOSITORY, useClass: CompanyUserRepository },
    { provide: COMPANY_PLAN_REPOSITORY, useClass: CompanyPlanRepository },
    // Logo en disco local (decisión cPanel). Migrar a S3 = cambiar este
    // useClass, mismo patrón que MAILER_PORT / PAYMENT_PROVIDER.
    { provide: PUBLIC_FILE_STORAGE, useClass: LocalPublicFileStorageAdapter },
    CompanyProfileUseCase,
    AdminCompaniesUseCase,
    CompanyMembersUseCase,
    CompanyRolesUseCase,
  ],
  // `COMPANY_PLAN_REPOSITORY` se exporta para el panel de inicio de la empresa
  // (`DashboardModule`): leer el plan vigente en sólo lectura. Escribir sobre la
  // suscripción sigue siendo exclusivo de `billing`.
  exports: [
    COMPANY_REPOSITORY,
    COMPANY_USER_REPOSITORY,
    COMPANY_PLAN_REPOSITORY,
  ],
})
export class CompaniesModule {}
