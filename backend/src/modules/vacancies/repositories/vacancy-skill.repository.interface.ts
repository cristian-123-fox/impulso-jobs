import { EntityManager } from 'typeorm';
import { VacancySkill } from '@/modules/vacancies/entities/vacancy-skill.entity';

export const VACANCY_SKILL_REPOSITORY = 'VACANCY_SKILL_REPOSITORY';

export interface IVacancySkillRepository {
  findByVacancyId(
    vacancyId: string,
    manager?: EntityManager,
  ): Promise<VacancySkill[]>;
  findBySkillId(
    skillId: string,
    manager?: EntityManager,
  ): Promise<VacancySkill[]>;
  deleteByVacancyId(vacancyId: string, manager?: EntityManager): Promise<void>;
  save(
    vacancySkill: VacancySkill,
    manager?: EntityManager,
  ): Promise<VacancySkill>;
  findVacancyIdsBySkillId(
    skillId: string,
    manager?: EntityManager,
  ): Promise<string[]>;
}
