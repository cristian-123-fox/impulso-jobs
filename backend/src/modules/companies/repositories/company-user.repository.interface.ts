import { EntityManager } from 'typeorm';
import { CompanyUser } from '@/modules/companies/entities/company-user.entity';

export const COMPANY_USER_REPOSITORY = 'COMPANY_USER_REPOSITORY';

export interface ICompanyUserRepository {
  save(member: CompanyUser, manager?: EntityManager): Promise<CompanyUser>;
}
