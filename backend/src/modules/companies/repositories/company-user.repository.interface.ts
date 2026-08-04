import { EntityManager } from 'typeorm';
import { CompanyUser } from '@/modules/companies/entities/company-user.entity';

export const COMPANY_USER_REPOSITORY = 'COMPANY_USER_REPOSITORY';

export interface ICompanyUserRepository {
  findByUserId(
    userId: string,
    manager?: EntityManager,
  ): Promise<CompanyUser | null>;
  /** Membresías de varios usuarios (listado admin: empresa de cada empleador). */
  findByUserIds(
    userIds: string[],
    manager?: EntityManager,
  ): Promise<CompanyUser[]>;
  /** Membresías de varias empresas (listado admin: dueño y nº de miembros). */
  findByCompanyIds(
    companyIds: string[],
    manager?: EntityManager,
  ): Promise<CompanyUser[]>;
  save(member: CompanyUser, manager?: EntityManager): Promise<CompanyUser>;
}
