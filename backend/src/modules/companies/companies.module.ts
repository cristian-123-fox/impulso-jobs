import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '@/modules/audit/audit.module';
import { CompanyProfileController } from '@/modules/companies/controllers/company-profile.controller';
import { Company } from '@/modules/companies/entities/company.entity';
import { CompanyUser } from '@/modules/companies/entities/company-user.entity';
import { COMPANY_REPOSITORY } from '@/modules/companies/repositories/company.repository.interface';
import { CompanyRepository } from '@/modules/companies/repositories/company.repository';
import { COMPANY_USER_REPOSITORY } from '@/modules/companies/repositories/company-user.repository.interface';
import { CompanyUserRepository } from '@/modules/companies/repositories/company-user.repository';
import { CompanyProfileUseCase } from '@/modules/companies/use-cases/company-profile.use-case';
import { AuthModule } from '@/modules/iam/auth/auth.module';
import { PermissionsModule } from '@/modules/iam/permissions/permissions.module';
import { UsersModule } from '@/modules/iam/users/users.module';

/** Dominio de empresas: entidad, membresías, perfil corporativo (M9) y repos. */
@Module({
  imports: [
    TypeOrmModule.forFeature([Company, CompanyUser]),
    AuditModule,
    AuthModule,
    PermissionsModule,
    UsersModule,
  ],
  controllers: [CompanyProfileController],
  providers: [
    { provide: COMPANY_REPOSITORY, useClass: CompanyRepository },
    { provide: COMPANY_USER_REPOSITORY, useClass: CompanyUserRepository },
    CompanyProfileUseCase,
  ],
  exports: [COMPANY_REPOSITORY, COMPANY_USER_REPOSITORY],
})
export class CompaniesModule {}
