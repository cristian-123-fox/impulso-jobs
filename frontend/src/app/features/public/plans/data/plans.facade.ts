import { Injectable, signal } from '@angular/core';
import {
  BillingOption,
  PlansHeroContent,
  PricingPlan,
} from '@/features/public/plans/models/plans.models';

/**
 * Facade del feature de planes. Centraliza el contenido estático para poder
 * sustituirlo más adelante por API o CMS sin reescribir la vista.
 */
@Injectable({ providedIn: 'root' })
export class PlansFacade {
  private readonly _hero = signal<PlansHeroContent>({
    title: 'Planes y precios',
    breadcrumbLabel: 'Planes',
    description:
      'Escoge el plan que mejor se ajusta al ritmo de contratación de tu empresa y activa tus vacantes en minutos.',
  });

  private readonly _billingOptions = signal<readonly BillingOption[]>([
    { id: 'monthly', label: 'Mensual' },
    { id: 'annual', label: 'Anual' },
  ]);

  private readonly _plans = signal<readonly PricingPlan[]>([
    {
      id: 'basic',
      name: 'Básico',
      summary: 'Ideal para empresas que publican oportunidades puntuales.',
      monthlyPrice: 90,
      annualPrice: 972,
      recommended: false,
      accent: 'blue',
      features: [
        { label: '1 vacante activa', included: true },
        { label: 'Sin publicación destacada', included: false },
        { label: 'Visibilidad estándar durante 20 días', included: false },
        { label: 'Soporte prioritario 24/7', included: false },
      ],
    },
    {
      id: 'standard',
      name: 'Estándar',
      summary: 'La mejor opción para equipos que necesitan contratar de forma continua.',
      monthlyPrice: 248,
      annualPrice: 2678,
      recommended: true,
      accent: 'amber',
      features: [
        { label: '3 vacantes activas', included: true },
        { label: '1 vacante destacada', included: true },
        { label: 'Visibilidad extendida durante 30 días', included: true },
        { label: 'Soporte prioritario 24/7', included: false },
      ],
    },
    {
      id: 'extended',
      name: 'Extendido',
      summary: 'Pensado para operaciones de reclutamiento de alto volumen.',
      monthlyPrice: 499,
      annualPrice: 5389,
      recommended: false,
      accent: 'pink',
      features: [
        { label: 'Vacantes activas ilimitadas', included: true },
        { label: '3 vacantes destacadas', included: true },
        { label: 'Visibilidad premium durante 45 días', included: true },
        { label: 'Soporte prioritario 24/7', included: true },
      ],
    },
  ]);

  readonly hero = this._hero.asReadonly();
  readonly billingOptions = this._billingOptions.asReadonly();
  readonly plans = this._plans.asReadonly();
}
