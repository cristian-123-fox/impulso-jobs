import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { CandidateProfile } from '@/modules/candidates/entities/candidate-profile.entity';
import { ProfileVisibility } from '@/modules/candidates/enums/candidate-settings.enum';
import {
  CandidateSearchCriteria,
  ICandidateSearchRepository,
} from '@/modules/talent/repositories/candidate-search.repository.interface';

/**
 * Búsqueda en el banco de talento. Es el único repositorio del proyecto que
 * usa `QueryBuilder` en lugar de `FindOptions`: los filtros por formación,
 * idiomas, habilidades y experiencia son `EXISTS` sobre otras tablas.
 *
 * Portabilidad PostgreSQL/MySQL: nada de `ILIKE`, `||` ni funciones de fecha —
 * las comparaciones de texto van con `LOWER(...) LIKE` y las de fecha contra un
 * valor ya calculado en la aplicación.
 */
@Injectable()
export class CandidateSearchRepository
  extends BaseRepository<CandidateProfile>
  implements ICandidateSearchRepository
{
  constructor(
    @InjectRepository(CandidateProfile) repo: Repository<CandidateProfile>,
  ) {
    super(repo);
  }

  async search(
    criteria: CandidateSearchCriteria,
    manager?: EntityManager,
  ): Promise<[CandidateProfile[], number]> {
    const qb = this.baseQuery(criteria.companyId, manager);
    this.applyFilters(qb, criteria);

    return (
      qb
        // Sin puntuación de relevancia todavía: lo más recientemente actualizado
        // primero, que es lo que mejor aproxima "perfil vivo".
        .orderBy('profile.updated_at', 'DESC')
        .addOrderBy('profile.id', 'ASC')
        .skip((criteria.page - 1) * criteria.limit)
        .take(criteria.limit)
        .getManyAndCount()
    );
  }

  findVisibleById(
    candidateProfileId: string,
    companyId: string,
    manager?: EntityManager,
  ): Promise<CandidateProfile | null> {
    return this.baseQuery(companyId, manager)
      .andWhere('profile.id = :candidateProfileId', { candidateProfileId })
      .getOne();
  }

  async hasAppliedToCompany(
    candidateProfileId: string,
    companyId: string,
    manager?: EntityManager,
  ): Promise<boolean> {
    const count = await this.repo(manager)
      .createQueryBuilder('profile')
      .where('profile.id = :candidateProfileId', { candidateProfileId })
      .andWhere(this.appliedToCompanyExists(), { companyId })
      .getCount();
    return count > 0;
  }

  async filterAppliedToCompany(
    candidateProfileIds: string[],
    companyId: string,
    manager?: EntityManager,
  ): Promise<string[]> {
    if (candidateProfileIds.length === 0) return [];
    const rows = await this.repo(manager)
      .createQueryBuilder('profile')
      .select('profile.id', 'id')
      .where('profile.id IN (:...candidateProfileIds)', { candidateProfileIds })
      .andWhere(this.appliedToCompanyExists(), { companyId })
      .getRawMany<{ id: string }>();
    return rows.map((row) => row.id);
  }

  /**
   * Base común de visibilidad (HU-016): el perfil es público, o el candidato
   * postuló a una vacante de esta empresa. Un candidato sin fila de
   * configuración cuenta como **público** — es el valor por defecto que fija
   * M8.
   */
  private baseQuery(
    companyId: string,
    manager?: EntityManager,
  ): SelectQueryBuilder<CandidateProfile> {
    return this.repo(manager)
      .createQueryBuilder('profile')
      .leftJoin(
        'candidate_profile_settings',
        'settings',
        'settings.candidate_profile_id = profile.id',
      )
      .where(
        `(
          settings.profile_visibility IS NULL
          OR settings.profile_visibility = :publicVisibility
          OR ${this.appliedToCompanyExists()}
        )`,
        { publicVisibility: ProfileVisibility.PUBLIC, companyId },
      );
  }

  /** Subconsulta reutilizable: ¿postuló a una vacante de la empresa? */
  private appliedToCompanyExists(): string {
    return `EXISTS (
      SELECT 1 FROM candidate_applications application
      WHERE application.candidate_profile_id = profile.id
        AND application.company_id = :companyId
        AND application.deleted_at IS NULL
    )`;
  }

  private applyFilters(
    qb: SelectQueryBuilder<CandidateProfile>,
    criteria: CandidateSearchCriteria,
  ): void {
    const search = criteria.search?.trim().toLowerCase();
    if (search) {
      qb.andWhere(
        `(
          LOWER(profile.first_name) LIKE :search
          OR LOWER(profile.last_name) LIKE :search
          OR LOWER(profile.professional_title) LIKE :search
        )`,
        { search: `%${search}%` },
      );
    }

    if (criteria.state) {
      qb.andWhere('profile.state = :state', { state: criteria.state });
    }

    if (criteria.municipality) {
      qb.andWhere('LOWER(profile.municipality) LIKE :municipality', {
        municipality: `%${criteria.municipality.trim().toLowerCase()}%`,
      });
    }

    if (criteria.educationLevel) {
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM candidate_educations education
          WHERE education.candidate_profile_id = profile.id
            AND education.education_level = :educationLevel
            AND education.deleted_at IS NULL
        )`,
        { educationLevel: criteria.educationLevel },
      );
    }

    if (criteria.languageCode) {
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM candidate_languages language
          WHERE language.candidate_profile_id = profile.id
            AND language.language_code = :languageCode
            AND language.deleted_at IS NULL
        )`,
        { languageCode: criteria.languageCode },
      );
    }

    if (criteria.skill) {
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM candidate_skills skill
          WHERE skill.candidate_profile_id = profile.id
            AND LOWER(skill.name) LIKE :skill
            AND skill.deleted_at IS NULL
        )`,
        { skill: `%${criteria.skill.trim().toLowerCase()}%` },
      );
    }

    if (criteria.experienceSince) {
      // "N años de experiencia" = tiene un empleo que empezó hace N años o más.
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM candidate_experiences experience
          WHERE experience.candidate_profile_id = profile.id
            AND experience.start_date <= :experienceSince
            AND experience.deleted_at IS NULL
        )`,
        { experienceSince: criteria.experienceSince },
      );
    }

    if (criteria.immediatelyAvailable) {
      qb.andWhere('settings.is_immediately_available = :available', {
        available: true,
      });
    }
  }
}
