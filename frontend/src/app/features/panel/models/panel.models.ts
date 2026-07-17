import { IconName } from '@/shared/ui';

/** Rol activo del panel (conmutado desde el header). */
export type PanelRole = 'admin' | 'empresa' | 'postulante';

/** Colores semánticos de la data (avatares, KPIs, series de gráficos). */
export type PanelColor = 'brand' | 'blue' | 'green' | 'amber' | 'pink' | 'teal';

/** Variantes de badge de estado dentro de tablas. */
export type BadgeKind =
  | 'green'
  | 'blue'
  | 'amber'
  | 'brand'
  | 'red'
  | 'gray'
  | 'gold';

/** Cómo se resuelve el bloque de contenido de la vista actual. */
export type PanelContent =
  | 'admin-dashboard'
  | 'empresa-dashboard'
  | 'postulante-dashboard'
  | 'candidate-profile'
  | 'candidate-resumes'
  | 'plans-catalog'
  | 'promo-buy'
  | 'job-cards'
  | 'vacancy-form'
  | 'table'
  | 'empty';

export interface PanelNavItem {
  readonly key: string;
  readonly label: string;
  readonly icon: IconName;
  readonly badge?: string;
}

export interface PanelMeta {
  readonly section: string;
  readonly userName: string;
  readonly roleLabel: string;
  readonly initials: string;
  readonly avatar: PanelColor;
  readonly title: string;
  readonly subtitle: string;
  readonly crumb: string;
}

export interface PanelKpi {
  readonly label: string;
  readonly value: string;
  readonly icon: IconName;
  readonly kind: PanelColor;
  readonly delta?: string;
  readonly up?: boolean;
  readonly note?: string;
}

/**
 * Celda de la tabla genérica. Se modela como interfaz plana (no unión
 * discriminada) para que la plantilla lea cualquier campo sin narrowing —
 * mismo criterio que `IconShape` en el UI Kit.
 */
export interface PanelCell {
  readonly type: 'avatar' | 'badge' | 'progress' | 'text';
  readonly text?: string;
  readonly name?: string;
  readonly sub?: string;
  readonly initials?: string;
  /** Tinte del avatar. */
  readonly kind?: PanelColor;
  /** Color del badge de estado. */
  readonly badgeKind?: BadgeKind;
  readonly variant?: 'default' | 'strong' | 'muted';
  readonly pct?: number;
}

export interface PanelTable {
  readonly title?: string;
  readonly filters?: readonly string[];
  readonly columns: readonly string[];
  readonly rows: readonly (readonly PanelCell[])[];
}

export interface JobItem {
  readonly title: string;
  readonly company: string;
  readonly location: string;
  readonly match: string;
  readonly salary: string;
  readonly initials: string;
  readonly logo: PanelColor;
  readonly tags: readonly string[];
}

// ---- Admin dashboard ----
export interface AreaChart {
  readonly line: string;
  readonly area: string;
  readonly points: readonly { readonly cx: string; readonly cy: string }[];
  readonly months: readonly string[];
}
export interface DonutSegment {
  readonly color: string;
  readonly dash: string;
  readonly offset: string;
}
export interface DonutChart {
  readonly segments: readonly DonutSegment[];
  readonly total: number;
  readonly legend: readonly {
    readonly label: string;
    readonly color: string;
    readonly value: number;
  }[];
}
export interface CategoryBar {
  readonly label: string;
  readonly value: number;
  readonly pct: number;
  readonly color: string;
}
export interface CompanyRow {
  readonly name: string;
  readonly sector: string;
  readonly vacancies: number;
  readonly initials: string;
  readonly logo: PanelColor;
  readonly status: string;
  readonly statusKind: BadgeKind;
}
export interface AdminDashboard {
  readonly area: AreaChart;
  readonly donut: DonutChart;
  readonly categories: readonly CategoryBar[];
  readonly companies: readonly CompanyRow[];
}

// ---- Empresa dashboard ----
export interface FunnelStage {
  readonly label: string;
  readonly count: number;
  readonly conv: string;
  readonly pct: number;
  readonly color: string;
}
export interface VacancyBar {
  readonly label: string;
  readonly value: number;
  readonly pct: number;
  readonly color: string;
}
export interface CandidateRow {
  readonly name: string;
  readonly location: string;
  readonly role: string;
  readonly match: number;
  readonly initials: string;
  readonly avatar: PanelColor;
  readonly stage: string;
  readonly stageKind: BadgeKind;
  readonly date: string;
}
export interface EmpresaDashboard {
  readonly funnel: readonly FunnelStage[];
  readonly vacancyBars: readonly VacancyBar[];
  readonly candidates: readonly CandidateRow[];
}

// ---- Postulante dashboard ----
export interface ProfileTask {
  readonly label: string;
  readonly done: boolean;
}
export interface ApplicationStep {
  readonly label: string;
  readonly done: boolean;
  readonly current: boolean;
}
export interface ApplicationCard {
  readonly title: string;
  readonly company: string;
  readonly date: string;
  readonly initials: string;
  readonly logo: PanelColor;
  readonly stageLabel: string;
  readonly stageKind: BadgeKind;
  readonly steps: readonly ApplicationStep[];
}
export interface PostulanteDashboard {
  readonly jobs: readonly JobItem[];
  readonly profilePct: number;
  readonly ringDash: string;
  readonly tasks: readonly ProfileTask[];
  readonly applications: readonly ApplicationCard[];
}

// ---- Planes / promociones ----
export interface PromoTier {
  readonly name: string;
  readonly price: string;
  readonly priceNote: string;
  readonly duration: string;
  readonly popular: boolean;
  readonly features: readonly string[];
  readonly count: number;
}
export interface BenefitCell {
  readonly kind: 'check' | 'dash' | 'text';
  readonly text?: string;
}
export interface BenefitRow {
  readonly label: string;
  readonly cells: readonly BenefitCell[];
}

// ---- Vacancy form ----
export interface VacancyFormValue {
  titulo: string;
  ciudad: string;
  categoria: string;
  fecha: string;
  modalidad: string;
  tipo: string;
  habilidades: string[];
}
