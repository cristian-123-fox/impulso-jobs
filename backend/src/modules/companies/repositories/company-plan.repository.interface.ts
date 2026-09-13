export const COMPANY_PLAN_REPOSITORY = 'COMPANY_PLAN_REPOSITORY';

/** El plan vigente de una empresa, resumido para el back-office. */
export interface CompanyPlanSummary {
  subscriptionId: string;
  planId: string;
  planName: string | null;
  planCode: string | null;
  status: string;
  currentPeriodEnd: Date | null;
  autoRenew: boolean;
}

/**
 * Lectura del plan vigente de una o varias empresas.
 *
 * **Por qué vive en `companies` y no en `billing`:** `BillingModule` ya importa
 * `CompaniesModule`, así que el listado del back-office no puede pedirle el
 * dato a billing sin cerrar un ciclo de DI. Importar las *entidades* de billing
 * no crea ciclo —una clase de entidad no es un módulo—, así que `companies` lee
 * las dos tablas directamente, **en sólo lectura y en lote**: una consulta por
 * página, sin N+1.
 *
 * Escribir sobre la suscripción sigue siendo cosa exclusiva de `billing`
 * (`AdminSubscriptionUseCase`), que es quien conoce los cupos y la activación.
 */
export interface ICompanyPlanRepository {
  /** Plan vigente de cada empresa. Las que no tienen no aparecen en el mapa. */
  findLiveByCompanyIds(
    companyIds: string[],
    now: Date,
  ): Promise<Map<string, CompanyPlanSummary>>;
}
