import { EntityManager } from 'typeorm';
import { CompanyUser } from '@/modules/companies/entities/company-user.entity';
import { CompanyMemberRole } from '@/modules/companies/enums/company-member-role.enum';

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
  /** Equipo de una empresa, del rol más alto al más bajo y luego por antigüedad. */
  findByCompanyId(
    companyId: string,
    manager?: EntityManager,
  ): Promise<CompanyUser[]>;
  findOne(
    companyId: string,
    userId: string,
    manager?: EntityManager,
  ): Promise<CompanyUser | null>;
  /** Cuántos miembros tienen ese rol interno (regla del último OWNER). */
  countByRole(
    companyId: string,
    role: CompanyMemberRole,
    manager?: EntityManager,
  ): Promise<number>;
  save(member: CompanyUser, manager?: EntityManager): Promise<CompanyUser>;
  /**
   * Baja definitiva de la membresía. No es soft-delete a propósito: el índice
   * único `(company_id, user_id)` incluiría la fila borrada e impediría volver
   * a dar de alta a esa persona en la misma empresa.
   */
  remove(
    companyId: string,
    userId: string,
    manager?: EntityManager,
  ): Promise<void>;
}
