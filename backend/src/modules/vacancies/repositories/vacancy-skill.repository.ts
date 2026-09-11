import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { VacancySkill } from '@/modules/vacancies/entities/vacancy-skill.entity';
import { IVacancySkillRepository } from '@/modules/vacancies/repositories/vacancy-skill.repository.interface';

@Injectable()
export class VacancySkillRepository
  extends BaseRepository<VacancySkill>
  implements IVacancySkillRepository
{
  constructor(
    @InjectRepository(VacancySkill)
    repo: Repository<VacancySkill>,
  ) {
    super(repo);
  }

  findByVacancyId(
    vacancyId: string,
    manager?: EntityManager,
  ): Promise<VacancySkill[]> {
    return this.repo(manager).find({
      where: { vacancyId },
      order: { sortOrder: 'ASC' },
    });
  }

  findBySkillId(
    skillId: string,
    manager?: EntityManager,
  ): Promise<VacancySkill[]> {
    return this.repo(manager).find({
      where: { skillId },
    });
  }

  async deleteByVacancyId(
    vacancyId: string,
    manager?: EntityManager,
  ): Promise<void> {
    await this.repo(manager).delete({ vacancyId });
  }

  save(
    vacancySkill: VacancySkill,
    manager?: EntityManager,
  ): Promise<VacancySkill> {
    return this.repo(manager).save(vacancySkill);
  }

  async findVacancyIdsBySkillId(
    skillId: string,
    manager?: EntityManager,
  ): Promise<string[]> {
    const relations = await this.repo(manager).find({
      where: { skillId },
    });
    return relations.map((r) => r.vacancyId);
  }
}
