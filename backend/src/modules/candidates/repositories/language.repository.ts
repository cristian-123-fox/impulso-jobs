import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Language } from '@/modules/candidates/entities/language.entity';
import { ILanguageRepository } from '@/modules/candidates/repositories/language.repository.interface';

@Injectable()
export class LanguageRepository implements ILanguageRepository {
  constructor(@InjectRepository(Language) private readonly repo: Repository<Language>) {}

  findAll(): Promise<Language[]> {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  findByCode(code: string): Promise<Language | null> {
    return this.repo.findOne({ where: { code } });
  }
}
