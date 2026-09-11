import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { runInTransaction } from '@/common/utils/transaction.util';
import { AuditService } from '@/modules/audit/audit.service';
import {
  CompanyVacancySkillDto,
  PublicVacancySkillDto,
  ReplaceVacancySkillsDto,
  SaveVacancySkillDto,
  toCompanyVacancySkill,
  toPublicVacancySkill,
} from '@/modules/vacancies/dto/vacancy-skill.dto';
import { Skill } from '@/modules/vacancies/entities/skill.entity';
import { VacancySkill } from '@/modules/vacancies/entities/vacancy-skill.entity';
import {
  type ISkillRepository,
  SKILL_REPOSITORY,
} from '@/modules/vacancies/repositories/skill.repository.interface';
import {
  type IVacancyRepository,
  VACANCY_REPOSITORY,
} from '@/modules/vacancies/repositories/vacancy.repository.interface';
import {
  type IVacancySkillRepository,
  VACANCY_SKILL_REPOSITORY,
} from '@/modules/vacancies/repositories/vacancy-skill.repository.interface';
import { VacancyOwnershipService } from '@/modules/vacancies/services/vacancy-ownership.service';

export interface VacancySkillActor {
  userId: string;
  ip: string;
  userAgent: string;
}

/**
 * T25: skills requeridas/deseadas en una vacante.
 *
 * Las skills se guardan junto con la vacante (mismo PUT, no un endpoint
 * aparte). Se permite crear nuevas skills si no existen.
 */
@Injectable()
export class VacancySkillsUseCase {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(SKILL_REPOSITORY)
    private readonly skills: ISkillRepository,
    @Inject(VACANCY_SKILL_REPOSITORY)
    private readonly vacancySkills: IVacancySkillRepository,
    @Inject(VACANCY_REPOSITORY)
    private readonly vacancies: IVacancyRepository,
    private readonly ownership: VacancyOwnershipService,
    private readonly audit: AuditService,
  ) {}

  async listForCompany(
    vacancyId: string,
    actor: VacancySkillActor,
  ): Promise<CompanyVacancySkillDto[]> {
    const company = await this.ownership.requireCompany(actor.userId);
    await this.ownership.requireOwnVacancy(vacancyId, company.id);
    return this.loadCompanySkills(vacancyId);
  }

  async replace(
    vacancyId: string,
    dto: ReplaceVacancySkillsDto,
    actor: VacancySkillActor,
  ): Promise<CompanyVacancySkillDto[]> {
    const company = await this.ownership.requireCompany(actor.userId);
    await this.ownership.requireOwnVacancy(vacancyId, company.id);

    // Validar que no haya duplicados de skillId o name
    this.assertNoDuplicates(dto.skills);

    await runInTransaction(this.dataSource, async (manager) => {
      await this.vacancySkills.deleteByVacancyId(vacancyId, manager);

      for (const [index, item] of dto.skills.entries()) {
        // Resolver o crear la skill
        const skill = await this.resolveSkill(item, manager);

        const vacancySkill = Object.assign(new VacancySkill(), {
          vacancyId,
          skillId: skill.id,
          isRequired: item.isRequired ?? false,
          sortOrder: item.sortOrder ?? index,
        });

        await this.vacancySkills.save(vacancySkill, manager);
      }
    });

    await this.audit.record({
      action: 'vacancies.skills.update',
      actorUserId: actor.userId,
      entity: 'vacancy',
      entityId: vacancyId,
      ip: actor.ip,
      userAgent: actor.userAgent,
      metadata: { total: dto.skills.length },
    });

    return this.loadCompanySkills(vacancyId);
  }

  /** Skills visibles en el portal público. */
  async listPublic(vacancyId: string): Promise<PublicVacancySkillDto[]> {
    const vacancy = await this.vacancies.findPublicById(vacancyId);
    if (!vacancy) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.VACANCY_NOT_FOUND,
        'La vacante no está disponible.',
      );
    }
    const vacancySkills = await this.vacancySkills.findByVacancyId(vacancyId);
    const skillIds = vacancySkills.map((vs) => vs.skillId);
    const skills = await this.skills.findByIds(skillIds);
    const skillMap = new Map(skills.map((s) => [s.id, s]));

    return vacancySkills
      .filter((vs) => skillMap.has(vs.skillId))
      .map((vs) => toPublicVacancySkill(vs, skillMap.get(vs.skillId)!));
  }

  /** Buscar skills para autocomplete (nombre contiene el query). */
  async searchSkills(query: string, limit = 10): Promise<Skill[]> {
    return this.skills.search(query, limit);
  }

  private async loadCompanySkills(
    vacancyId: string,
  ): Promise<CompanyVacancySkillDto[]> {
    const vacancySkills = await this.vacancySkills.findByVacancyId(vacancyId);
    const skillIds = vacancySkills.map((vs) => vs.skillId);
    const skills = await this.skills.findByIds(skillIds);
    const skillMap = new Map(skills.map((s) => [s.id, s]));

    return vacancySkills
      .filter((vs) => skillMap.has(vs.skillId))
      .map((vs) => toCompanyVacancySkill(vs, skillMap.get(vs.skillId)!));
  }

  private async resolveSkill(
    item: SaveVacancySkillDto,
    manager?: EntityManager,
  ): Promise<Skill> {
    // Si tiene skillId, buscar por ID
    if (item.skillId) {
      const existing = await this.skills.findByIds([item.skillId], manager);
      if (existing.length > 0) {
        return existing[0];
      }
    }

    // Buscar por nombre (case-insensitive)
    const existingByName = await this.skills.findByName(item.name, manager);
    if (existingByName) {
      return existingByName;
    }

    // Crear nueva skill
    const slug = this.generateSlug(item.name);
    const newSkill = Object.assign(new Skill(), {
      name: item.name.trim(),
      slug,
    });
    return this.skills.save(newSkill, manager);
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-');
  }

  private assertNoDuplicates(skills: SaveVacancySkillDto[]): void {
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();

    for (const skill of skills) {
      if (skill.skillId) {
        if (seenIds.has(skill.skillId)) {
          throw new AppException(
            HttpStatus.BAD_REQUEST,
            ErrorCode.VALIDATION_ERROR,
            'No puede haber skills duplicadas.',
          );
        }
        seenIds.add(skill.skillId);
      } else {
        const normalizedName = skill.name.toLowerCase().trim();
        if (seenNames.has(normalizedName)) {
          throw new AppException(
            HttpStatus.BAD_REQUEST,
            ErrorCode.VALIDATION_ERROR,
            'No puede haber skills duplicadas.',
          );
        }
        seenNames.add(normalizedName);
      }
    }
  }
}
