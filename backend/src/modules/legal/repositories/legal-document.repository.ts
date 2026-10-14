import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { LegalDocument } from '@/modules/legal/entities/legal-document.entity';
import { LegalDocumentCode } from '@/modules/legal/enums/legal.enums';
import { ILegalDocumentRepository } from '@/modules/legal/repositories/legal-document.repository.interface';

@Injectable()
export class LegalDocumentRepository
  extends BaseRepository<LegalDocument>
  implements ILegalDocumentRepository
{
  constructor(
    @InjectRepository(LegalDocument) repo: Repository<LegalDocument>,
  ) {
    super(repo);
  }

  async listCurrent(manager?: EntityManager): Promise<LegalDocument[]> {
    return this.repo(manager).find({ where: { isCurrent: true } });
  }

  async findVersion(
    code: LegalDocumentCode,
    version: string,
    manager?: EntityManager,
  ): Promise<LegalDocument | null> {
    return this.repo(manager).findOne({ where: { code, version } });
  }

  async listHistory(
    code: LegalDocumentCode,
    manager?: EntityManager,
  ): Promise<LegalDocument[]> {
    return this.repo(manager).find({
      where: { code },
      order: { effectiveDate: 'DESC' },
    });
  }
}
