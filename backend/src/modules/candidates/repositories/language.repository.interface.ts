import { Language } from '@/modules/candidates/entities/language.entity';

export const LANGUAGE_REPOSITORY = 'LANGUAGE_REPOSITORY';

export interface ILanguageRepository {
  findAll(): Promise<Language[]>;
  findByCode(code: string): Promise<Language | null>;
}
