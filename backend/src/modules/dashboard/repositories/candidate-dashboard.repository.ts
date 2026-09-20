import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CandidateApplication } from '@/modules/applications/entities/candidate-application.entity';
import { CandidateEducation } from '@/modules/candidates/entities/candidate-education.entity';
import { CandidateExperience } from '@/modules/candidates/entities/candidate-experience.entity';
import { CandidateLanguage } from '@/modules/candidates/entities/candidate-language.entity';
import { CandidateProfile } from '@/modules/candidates/entities/candidate-profile.entity';
import { CandidateResume } from '@/modules/candidates/entities/candidate-resume.entity';
import { CandidateSkill } from '@/modules/candidates/entities/candidate-skill.entity';
import { SavedVacancy } from '@/modules/candidates/entities/saved-vacancy.entity';
import { TalentAccessView } from '@/modules/talent/entities/talent-access-view.entity';
import {
  CountByKey,
  DailyCount,
} from '@/modules/dashboard/repositories/company-dashboard.repository.interface';
import {
  ICandidateDashboardRepository,
  ProfileSectionCounts,
  ProfileViewsSummary,
} from '@/modules/dashboard/repositories/candidate-dashboard.repository.interface';
import {
  toDateKey,
  toNumber,
} from '@/modules/dashboard/repositories/aggregate.util';

@Injectable()
export class CandidateDashboardRepository implements ICandidateDashboardRepository {
  constructor(
    @InjectRepository(CandidateProfile)
    private readonly profiles: Repository<CandidateProfile>,
    @InjectRepository(CandidateApplication)
    private readonly applications: Repository<CandidateApplication>,
    @InjectRepository(SavedVacancy)
    private readonly saved: Repository<SavedVacancy>,
    @InjectRepository(CandidateExperience)
    private readonly experiences: Repository<CandidateExperience>,
    @InjectRepository(CandidateEducation)
    private readonly educations: Repository<CandidateEducation>,
    @InjectRepository(CandidateLanguage)
    private readonly languages: Repository<CandidateLanguage>,
    @InjectRepository(CandidateSkill)
    private readonly skills: Repository<CandidateSkill>,
    @InjectRepository(CandidateResume)
    private readonly resumes: Repository<CandidateResume>,
    @InjectRepository(TalentAccessView)
    private readonly views: Repository<TalentAccessView>,
  ) {}

  findProfileByUserId(userId: string): Promise<CandidateProfile | null> {
    return this.profiles.findOne({ where: { userId } });
  }

  countApplications(profileId: string): Promise<number> {
    return this.applications.count({
      where: { candidateProfileId: profileId },
    });
  }

  async countApplicationsByStatus(profileId: string): Promise<CountByKey[]> {
    const rows = await this.applications
      .createQueryBuilder('a')
      .select('a.status_code', 'key')
      .addSelect('COUNT(*)', 'count')
      .where('a.candidate_profile_id = :profileId', { profileId })
      .groupBy('a.status_code')
      .getRawMany<{ key: string; count: string | number }>();
    return rows.map((row) => ({ key: row.key, count: toNumber(row.count) }));
  }

  async applicationsPerDay(
    profileId: string,
    from: Date,
    to: Date,
  ): Promise<DailyCount[]> {
    const rows = await this.applications
      .createQueryBuilder('a')
      .select('CAST(a.applied_at AS DATE)', 'day')
      .addSelect('COUNT(*)', 'count')
      .where('a.candidate_profile_id = :profileId', { profileId })
      .andWhere('a.applied_at >= :from', { from })
      .andWhere('a.applied_at <= :to', { to })
      .groupBy('CAST(a.applied_at AS DATE)')
      .orderBy('CAST(a.applied_at AS DATE)', 'ASC')
      .getRawMany<{ day: Date | string; count: string | number }>();

    return rows.map((row) => ({
      date: toDateKey(row.day),
      count: toNumber(row.count),
    }));
  }

  countSavedVacancies(profileId: string): Promise<number> {
    return this.saved.count({ where: { candidateProfileId: profileId } });
  }

  async profileSections(profileId: string): Promise<ProfileSectionCounts> {
    const where = { candidateProfileId: profileId };
    const [experiences, educations, languages, skills, resumes] =
      await Promise.all([
        this.experiences.count({ where }),
        this.educations.count({ where }),
        this.languages.count({ where }),
        this.skills.count({ where }),
        this.resumes.count({ where }),
      ]);
    return { experiences, educations, languages, skills, resumes };
  }

  /**
   * Quién ha mirado su CV. La tabla tiene una fila por **empresa y perfil** (la
   * segunda consulta de la misma empresa no cobra ni se registra de nuevo), así
   * que el total ya son empresas distintas, no visitas repetidas.
   */
  async profileViews(
    profileId: string,
    since: Date,
  ): Promise<ProfileViewsSummary> {
    const [total, recent, last] = await Promise.all([
      this.views.count({ where: { candidateProfileId: profileId } }),
      this.views
        .createQueryBuilder('v')
        .where('v.candidate_profile_id = :profileId', { profileId })
        .andWhere('v.viewed_at >= :since', { since })
        .getCount(),
      this.views.findOne({
        where: { candidateProfileId: profileId },
        order: { viewedAt: 'DESC' },
      }),
    ]);

    return { total, recent, lastViewedAt: last?.viewedAt ?? null };
  }
}
