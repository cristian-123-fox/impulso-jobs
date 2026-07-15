import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from '@/modules/companies/entities/company.entity';
import { CompanyUser } from '@/modules/companies/entities/company-user.entity';
import { COMPANY_REPOSITORY } from '@/modules/companies/repositories/company.repository.interface';
import { CompanyRepository } from '@/modules/companies/repositories/company.repository';
import { COMPANY_USER_REPOSITORY } from '@/modules/companies/repositories/company-user.repository.interface';
import { CompanyUserRepository } from '@/modules/companies/repositories/company-user.repository';

/** Dominio de empresas: entidad, membresías y sus repositorios. */
@Module({
  imports: [TypeOrmModule.forFeature([Company, CompanyUser])],
  providers: [
    { provide: COMPANY_REPOSITORY, useClass: CompanyRepository },
    { provide: COMPANY_USER_REPOSITORY, useClass: CompanyUserRepository },
  ],
  exports: [COMPANY_REPOSITORY, COMPANY_USER_REPOSITORY],
})
export class CompaniesModule {}
