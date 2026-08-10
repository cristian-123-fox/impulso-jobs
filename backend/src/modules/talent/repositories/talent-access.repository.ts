import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, IsNull, MoreThan, Repository } from 'typeorm';
import { TalentAccessGrant } from '@/modules/talent/entities/talent-access-grant.entity';
import { TalentAccessView } from '@/modules/talent/entities/talent-access-view.entity';
import { ITalentAccessRepository } from '@/modules/talent/repositories/talent-access.repository.interface';

@Injectable()
export class TalentAccessRepository implements ITalentAccessRepository {
  constructor(
    @InjectRepository(TalentAccessGrant)
    private readonly grants: Repository<TalentAccessGrant>,
    @InjectRepository(TalentAccessView)
    private readonly views: Repository<TalentAccessView>,
  ) {}

  private grantRepo(manager?: EntityManager): Repository<TalentAccessGrant> {
    return manager ? manager.getRepository(TalentAccessGrant) : this.grants;
  }

  private viewRepo(manager?: EntityManager): Repository<TalentAccessView> {
    return manager ? manager.getRepository(TalentAccessView) : this.views;
  }

  findActiveGrants(
    companyId: string,
    now: Date,
    manager?: EntityManager,
  ): Promise<TalentAccessGrant[]> {
    // Sin vencimiento o con vencimiento futuro. Se consume primero el que
    // caduca antes, para no desperdiciar cupo.
    return this.grantRepo(manager).find({
      where: [
        { companyId, expiresAt: IsNull() },
        { companyId, expiresAt: MoreThan(now) },
      ],
      order: { expiresAt: 'ASC', createdAt: 'ASC' },
    });
  }

  saveGrant(
    grant: TalentAccessGrant,
    manager?: EntityManager,
  ): Promise<TalentAccessGrant> {
    return this.grantRepo(manager).save(grant);
  }

  findView(
    companyId: string,
    candidateProfileId: string,
    manager?: EntityManager,
  ): Promise<TalentAccessView | null> {
    return this.viewRepo(manager).findOne({
      where: { companyId, candidateProfileId },
    });
  }

  async findViewedCandidateIds(
    companyId: string,
    candidateProfileIds: string[],
    manager?: EntityManager,
  ): Promise<string[]> {
    if (candidateProfileIds.length === 0) return [];
    const rows = await this.viewRepo(manager).find({
      where: { companyId, candidateProfileId: In(candidateProfileIds) },
      select: { candidateProfileId: true },
    });
    return rows.map((row) => row.candidateProfileId);
  }

  saveView(
    view: TalentAccessView,
    manager?: EntityManager,
  ): Promise<TalentAccessView> {
    return this.viewRepo(manager).save(view);
  }
}
