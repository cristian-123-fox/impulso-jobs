import { EntityManager } from 'typeorm';
import { Company } from '@/modules/companies/entities/company.entity';

export const COMPANY_REPOSITORY = 'COMPANY_REPOSITORY';

export interface ICompanyRepository {
  existsByRfc(rfc: string, manager?: EntityManager): Promise<boolean>;
  save(company: Company, manager?: EntityManager): Promise<Company>;
}
