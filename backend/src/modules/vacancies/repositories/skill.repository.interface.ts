import { EntityManager } from 'typeorm';
import { Skill } from '@/modules/vacancies/entities/skill.entity';

export const SKILL_REPOSITORY = 'SKILL_REPOSITORY';

export interface ISkillRepository {
  findByName(name: string, manager?: EntityManager): Promise<Skill | null>;
  findBySlug(slug: string, manager?: EntityManager): Promise<Skill | null>;
  search(
    query: string,
    limit: number,
    manager?: EntityManager,
  ): Promise<Skill[]>;
  save(skill: Skill, manager?: EntityManager): Promise<Skill>;
  findByIds(ids: string[], manager?: EntityManager): Promise<Skill[]>;
}
