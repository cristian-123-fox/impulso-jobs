import { EntityManager } from 'typeorm';
import { Vacancy } from '@/modules/vacancies/entities/vacancy.entity';
import {
  EmploymentType,
  ExperienceLevel,
  PublicVacancySort,
  VacancyStatus,
  WorkMode,
} from '@/modules/vacancies/enums/vacancy.enums';

export const VACANCY_REPOSITORY = 'VACANCY_REPOSITORY';

/** Filtros del listado de la empresa (sus propias vacantes). */
export interface CompanyVacancySearch {
  companyId: string;
  /** Coincidencia parcial sobre el título. */
  search?: string;
  status?: VacancyStatus;
  page: number;
  limit: number;
}

/** Filtros del portal público. Sólo devuelve vacantes activas. */
export interface PublicVacancySearch {
  /** Coincidencia parcial sobre título y descripción. */
  search?: string;
  state?: string;
  municipality?: string;
  employmentType?: EmploymentType;
  workMode?: WorkMode;
  experienceLevel?: ExperienceLevel;
  /** Área profesional (catálogo embebido). */
  areaId?: number;
  /** Vacantes que pagan al menos esta cifra (MXN, sólo salario público). */
  salaryMin?: number;
  /** Publicadas en los últimos N días. */
  publishedWithinDays?: number;
  /** Orden del listado; por defecto la prioridad monetizada (relevance). */
  sort?: PublicVacancySort;
  page: number;
  limit: number;
}

export interface IVacancyRepository {
  findById(id: string, manager?: EntityManager): Promise<Vacancy | null>;
  /** Varias vacantes por id (listado de postulaciones: título y empresa). */
  findByIds(ids: string[], manager?: EntityManager): Promise<Vacancy[]>;
  /** Detalle acotado por ownership: la vacante debe ser de esa empresa. */
  findByIdAndCompany(
    id: string,
    companyId: string,
    manager?: EntityManager,
  ): Promise<Vacancy | null>;
  /** Página de vacantes de la empresa, de la más reciente a la más antigua. */
  findAndCountByCompany(
    criteria: CompanyVacancySearch,
    manager?: EntityManager,
  ): Promise<[Vacancy[], number]>;
  /**
   * Página del portal: sólo activas, ordenadas por prioridad
   * (destacadas → urgentes → refresco más reciente).
   */
  findAndCountPublic(
    criteria: PublicVacancySearch,
    manager?: EntityManager,
  ): Promise<[Vacancy[], number]>;
  /** Detalle público: sólo si la vacante está activa. */
  findPublicById(id: string, manager?: EntityManager): Promise<Vacancy | null>;
  /** Vacantes activas cuya vigencia ya venció (T20, job `vacancies:expire`). */
  findExpiredActive(now: Date, manager?: EntityManager): Promise<Vacancy[]>;
  /** Suma vistas consolidadas al contador (T18, job `views:consolidate`). */
  incrementViews(
    vacancyId: string,
    by: number,
    manager?: EntityManager,
  ): Promise<void>;
  countByCompany(
    companyId: string,
    status?: VacancyStatus,
    manager?: EntityManager,
  ): Promise<number>;
  save(vacancy: Vacancy, manager?: EntityManager): Promise<Vacancy>;
}
