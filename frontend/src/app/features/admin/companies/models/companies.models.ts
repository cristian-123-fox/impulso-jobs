/** Estado de la suscripción de una empresa (espeja `SubscriptionStatus`). */
export enum SubscriptionStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  [SubscriptionStatus.PENDING_PAYMENT]: 'Pendiente de pago',
  [SubscriptionStatus.ACTIVE]: 'Activo',
  [SubscriptionStatus.PAST_DUE]: 'Pago vencido',
  [SubscriptionStatus.CANCELLED]: 'Cancelado',
  [SubscriptionStatus.EXPIRED]: 'Vencido',
};

/**
 * Plan vigente de la empresa (T34). Llega dentro de `AdminCompany`, tanto en
 * el listado como en el detalle; `null` significa que no tiene ninguno.
 */
export interface AdminCompanySubscription {
  subscriptionId: string;
  planId: string;
  planName: string | null;
  planCode: string | null;
  status: string;
  currentPeriodEnd: string | null;
  autoRenew: boolean;
}

/** Empresa en el back-office (`GET /admin/companies`). */
export interface AdminCompany {
  id: string;
  businessName: string;
  legalName: string;
  rfc: string;
  taxRegime: string;
  postalCode: string;
  economicSector: string | null;
  companyType: string | null;
  corporateEmail: string | null;
  phoneNumber: string | null;
  website: string | null;
  country: string;
  state: string;
  municipality: string;
  logoUrl: string | null;
  createdAt: string;
  ownerEmail: string | null;
  memberCount: number;
  subscription: AdminCompanySubscription | null;
}

export interface CompaniesPage {
  items: AdminCompany[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface CompaniesFilters {
  search?: string;
  state?: string;
  /** Clave de columna; debe existir en `COMPANY_SORT_COLUMNS` del backend. */
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  page: number;
  limit: number;
}

export interface CreateCompanyPayload {
  businessName: string;
  legalName: string;
  rfc: string;
  taxRegime: string;
  postalCode: string;
  state: string;
  municipality: string;
  economicSector?: string;
  companyType?: string;
  corporateEmail?: string;
  phoneNumber?: string;
  website?: string;
  /** Si se envía, crea la cuenta OWNER verificada junto con la empresa. */
  owner?: { email: string; password: string };
}

/** Edición: el RFC es inmutable y la cuenta dueña se gestiona en el equipo. */
export type UpdateCompanyPayload = Omit<CreateCompanyPayload, 'rfc' | 'owner'>;

export interface CreateCompanyResult {
  company: AdminCompany;
  ownerUserId: string | null;
}

/** Rol de un usuario dentro de la empresa (`company_users`). */
export enum CompanyMemberRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  RECRUITER = 'RECRUITER',
  MEMBER = 'MEMBER',
}

export const COMPANY_MEMBER_ROLE_LABELS: Record<CompanyMemberRole, string> = {
  [CompanyMemberRole.OWNER]: 'Propietario',
  [CompanyMemberRole.ADMIN]: 'Administrador',
  [CompanyMemberRole.RECRUITER]: 'Reclutador',
  [CompanyMemberRole.MEMBER]: 'Miembro',
};

/** Qué hace cada rol interno, para explicarlo en la interfaz. */
export const COMPANY_MEMBER_ROLE_HINTS: Record<CompanyMemberRole, string> = {
  [CompanyMemberRole.OWNER]:
    'Dueño de la cuenta: gestiona la empresa, su equipo y la facturación.',
  [CompanyMemberRole.ADMIN]:
    'Administra la empresa y su equipo, sin ser el titular.',
  [CompanyMemberRole.RECRUITER]:
    'Publica vacantes y gestiona candidatos y postulaciones.',
  [CompanyMemberRole.MEMBER]:
    'Acceso básico de consulta a la información de la empresa.',
};

export interface CompanyMember {
  userId: string;
  email: string;
  companyRole: CompanyMemberRole;
  /** Estado de la cuenta de plataforma (ACTIVE/INACTIVE/SUSPENDED). */
  status: string;
  emailVerified: boolean;
  lastLogin: string | null;
  joinedAt: string;
}

/** Alta de miembro: o se vincula una cuenta (`userId`) o se crea una nueva. */
export interface AddCompanyMemberPayload {
  role: CompanyMemberRole;
  userId?: string;
  email?: string;
  password?: string;
}

// ------------------------------------------------------------------- T34

/**
 * Asignación o cambio de plan desde el back-office.
 *
 * `amount` va **sin IVA**: es el subtotal que se registra como cobrado, y el
 * backend recalcula el impuesto con la tasa del plan. Si se omite, se usa el
 * precio vigente del plan.
 */
export interface AssignSubscriptionPayload {
  planId: string;
  reason: string;
  currentPeriodEnd?: string;
  amount?: number;
  method?: string;
  autoRenew?: boolean;
}

/** Prórrogas y ajustes de renovación sobre la suscripción vigente. */
export interface UpdateSubscriptionPayload {
  reason: string;
  currentPeriodEnd?: string;
  autoRenew?: boolean;
}

/** Suscripción tal como la devuelven los endpoints de `/subscription`. */
export interface CompanySubscriptionDetail {
  id: string;
  planId: string;
  planName: string | null;
  status: string;
  startsAt: string | null;
  currentPeriodEnd: string | null;
  autoRenew: boolean;
}
