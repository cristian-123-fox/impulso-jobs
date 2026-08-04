import { EntityManager } from 'typeorm';
import { Company } from '@/modules/companies/entities/company.entity';

export const COMPANY_REPOSITORY = 'COMPANY_REPOSITORY';

/** Filtros del listado administrativo de empresas (`GET /admin/companies`). */
export interface CompanySearchCriteria {
  /** Coincidencia parcial sobre nombre comercial, razón social o RFC. */
  search?: string;
  /** Código ISO 3166-2:MX. */
  state?: string;
  page: number;
  limit: number;
}

export interface ICompanyRepository {
  existsByRfc(rfc: string, manager?: EntityManager): Promise<boolean>;
  findById(id: string, manager?: EntityManager): Promise<Company | null>;
  findByIds(ids: string[], manager?: EntityManager): Promise<Company[]>;
  save(company: Company, manager?: EntityManager): Promise<Company>;
  /** Página de empresas + total, ordenadas por fecha de alta descendente. */
  findAndCount(
    criteria: CompanySearchCriteria,
    manager?: EntityManager,
  ): Promise<[Company[], number]>;
  count(manager?: EntityManager): Promise<number>;
}
