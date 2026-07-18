import { EntityManager } from 'typeorm';
import { CompanyUser } from '@/modules/companies/entities/company-user.entity';

export const COMPANY_USER_REPOSITORY = 'COMPANY_USER_REPOSITORY';

export interface ICompanyUserRepository {
  findByUserId(
    userId: string,
    manager?: EntityManager,
  ): Promise<CompanyUser | null>;
  save(member: CompanyUser, manager?: EntityManager): Promise<CompanyUser>;
}
