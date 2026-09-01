import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import {
  DEFAULT_MAX_PAUSES,
  EmploymentType,
  ExperienceLevel,
  VacancyStatus,
  WorkMode,
} from '@/modules/vacancies/enums/vacancy.enums';

/**
 * Vacante publicada por una empresa (M10). Localizada a México: ubicación por
 * estado/municipio y salario mensual en MXN.
 *
 * Los distintivos (`isFeatured`, `isUrgent`, `isConfidential`) y el límite de
 * pausas los **deriva la promoción o el plan activo** (M14): no se editan desde
 * el formulario de la empresa. Mientras M14 no exista, nacen en su valor neutro.
 */
@Entity('vacancies')
export class Vacancy extends BaseEntity {
  @Index('idx_vacancies_company_id')
  @Column({ name: 'company_id', type: 'varchar', length: 36 })
  companyId!: string;

  @Column({ type: 'varchar', length: 160 })
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'text', nullable: true })
  requirements?: string | null;

  @Column({ name: 'employment_type', type: 'varchar', length: 20 })
  employmentType!: EmploymentType;

  @Column({ name: 'work_mode', type: 'varchar', length: 20 })
  workMode!: WorkMode;

  /** Código de estado (ISO 3166-2:MX). */
  @Column({ type: 'varchar', length: 10 })
  state!: string;

  @Column({ type: 'varchar', length: 120 })
  municipality!: string;

  @Column({ name: 'experience_level', type: 'varchar', length: 20 })
  experienceLevel!: ExperienceLevel;

  /** Salario mensual en MXN. Ambos extremos son opcionales ("a convenir"). */
  @Column({
    name: 'salary_min',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  salaryMin?: string | null;

  @Column({
    name: 'salary_max',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  salaryMax?: string | null;

  /** Oculta el rango en el portal aunque esté capturado. */
  @Column({ name: 'salary_hidden', type: 'boolean', default: false })
  salaryHidden!: boolean;

  @Index('idx_vacancies_status')
  @Column({ type: 'varchar', length: 20, default: VacancyStatus.ACTIVE })
  status!: VacancyStatus;

  @Column({ name: 'published_at', type: 'timestamp', nullable: true })
  publishedAt?: Date | null;

  @Column({ name: 'closed_at', type: 'timestamp', nullable: true })
  closedAt?: Date | null;

  // ---- Distintivos derivados del plan/promoción (M14) ----
  @Column({ name: 'is_verified', type: 'boolean', default: false })
  isVerified!: boolean;

  @Column({ name: 'is_featured', type: 'boolean', default: false })
  isFeatured!: boolean;

  @Column({ name: 'is_urgent', type: 'boolean', default: false })
  isUrgent!: boolean;

  /** Oculta la identidad de la empresa en la vista pública. */
  @Column({ name: 'is_confidential', type: 'boolean', default: false })
  isConfidential!: boolean;

  /**
   * Capacidad de marcar la vacante como confidencial. La otorga el plan
   * (`urgent_confidential_badge`); la empresa decide si la usa.
   */
  @Column({ name: 'can_be_confidential', type: 'boolean', default: false })
  canBeConfidential!: boolean;

  /** Capacidad de definir preguntas de filtrado (`screening_questions`, M15). */
  @Column({ name: 'screening_enabled', type: 'boolean', default: false })
  screeningEnabled!: boolean;

  // ---- Pausas y refresco ----
  @Column({ name: 'pause_count', type: 'int', default: 0 })
  pauseCount!: number;

  @Column({ name: 'max_pauses', type: 'int', default: DEFAULT_MAX_PAUSES })
  maxPauses!: number;

  /**
   * Permiso del plan para cambiar el título al reactivar. Sin plan es `false`:
   * el título queda fijo desde la publicación.
   */
  @Column({
    name: 'can_edit_title_on_reactivate',
    type: 'boolean',
    default: false,
  })
  canEditTitleOnReactivate!: boolean;

  /** Marca el "re-subido" en el listado público. */
  @Index('idx_vacancies_refreshed_at')
  @Column({ name: 'refreshed_at', type: 'timestamp', nullable: true })
  refreshedAt?: Date | null;
}
