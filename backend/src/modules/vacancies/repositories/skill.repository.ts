import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, ILike, In, Repository } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { Skill } from '@/modules/vacancies/entities/skill.entity';
import { ISkillRepository } from '@/modules/vacancies/repositories/skill.repository.interface';

@Injectable()
export class SkillRepository
  extends BaseRepository<Skill>
  implements ISkillRepository
{
  constructor(
    @InjectRepository(Skill)
    repo: Repository<Skill>,
  ) {
    super(repo);
  }

  findByName(name: string, manager?: EntityManager): Promise<Skill | null> {
    return this.repo(manager).findOne({
      where: { name: ILike(name) },
    });
  }

  findBySlug(slug: string, manager?: EntityManager): Promise<Skill | null> {
    return this.repo(manager).findOne({
      where: { slug },
    });
  }

  search(
    query: string,
    limit: number,
    manager?: EntityManager,
  ): Promise<Skill[]> {
    return this.repo(manager).find({
      where: { name: ILike(`%${query}%`) },
      order: { name: 'ASC' },
      take: limit,
    });
  }

  findByIds(ids: string[], manager?: EntityManager): Promise<Skill[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.repo(manager).find({
      where: { id: In(ids) },
    });
  }

  save(skill: Skill, manager?: EntityManager): Promise<Skill> {
    return this.repo(manager).save(skill);
  }
}
