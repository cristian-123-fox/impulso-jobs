/** Origen del cupo de visitas a la base de talento. */
export enum TalentGrantSource {
  /** Promoción de una vacante (Media / Alta) — M14. */
  PROMOTION = 'PROMOTION',
  /** Suscripción anual de la empresa — M14. */
  SUBSCRIPTION = 'SUBSCRIPTION',
  /** Otorgado a mano por un administrador (cortesía, soporte). */
  MANUAL = 'MANUAL',
}

/**
 * Por qué la empresa puede ver a este candidato. Determina si la consulta
 * consume cupo.
 */
export enum CandidateAccessSource {
  /** Postuló a una vacante de la empresa: acceso gratuito y permanente. */
  APPLICANT = 'APPLICANT',
  /** Perfil público de la base de talento: consume una visita del cupo. */
  TALENT_POOL = 'TALENT_POOL',
}

/** Visitas ilimitadas (lo usará el plan Anual si así se define en M14). */
export const UNLIMITED_VISITS = -1;
