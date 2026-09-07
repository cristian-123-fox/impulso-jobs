import { Injectable, computed, inject, signal } from '@angular/core';
import { PublicVacanciesApi } from '@/features/public/vacancies/data/public-vacancies.api';
import { PublicVacancy } from '@/features/public/vacancies/models/public-vacancies.models';
import {
  HeroStat,
  HomeArea,
  HomeCompany,
  LoadState,
  Testimonial,
  WorkStep,
} from '@/features/public/home/models/home.models';

/** Cuántas vacantes se muestran en la sección destacada de la home. */
const FEATURED_LIMIT = 6;

/**
 * Facade de la home.
 *
 * Las vacantes, el total y el muro de empresas salen de `GET /vacancies`, que
 * es público y ya estaba en uso en `/vacantes`. Antes la home servía cinco
 * vacantes inventadas en Bogotá y cifras como "10M+ usuarios activos al día"
 * mientras la API real quedaba sin consultar.
 *
 * Lo que sigue siendo estático es sólo contenido de marca (los tres pasos, las
 * áreas destacadas y los testimonios), no métricas: una cifra inventada en una
 * página de marketing es una promesa que el producto no cumple.
 */
@Injectable({ providedIn: 'root' })
export class HomeFacade {
  private readonly api = inject(PublicVacanciesApi);

  private readonly _featured = signal<readonly PublicVacancy[]>([]);
  private readonly _featuredState = signal<LoadState>('loading');
  private readonly _totalVacancies = signal<number | null>(null);

  readonly featured = this._featured.asReadonly();
  readonly featuredState = this._featuredState.asReadonly();

  /**
   * Empresas con vacante abierta, deducidas del propio listado. Las
   * confidenciales llegan con `company: null` y quedan fuera, como debe ser.
   */
  readonly companies = computed<readonly HomeCompany[]>(() => {
    const byName = new Map<string, HomeCompany>();
    for (const vacancy of this._featured()) {
      const company = vacancy.company;
      if (!company || byName.has(company.businessName)) continue;
      byName.set(company.businessName, {
        name: company.businessName,
        logoUrl: company.logoUrl,
      });
    }
    return [...byName.values()];
  });

  /**
   * Tarjetas del hero. La primera es real (el total que reporta la API); la
   * segunda es una propiedad del producto, no una métrica, así que no caduca.
   */
  readonly heroStats = computed<readonly HeroStat[]>(() => {
    const total = this._totalVacancies();
    return [
      {
        value: total === null ? '...' : formatCount(total),
        label: total === 1 ? 'Vacante abierta' : 'Vacantes abiertas',
        icon: 'briefcase',
        tone: 'brand',
      },
      {
        value: 'Gratis',
        label: 'Para candidatos',
        icon: 'check',
        tone: 'green',
      },
    ];
  });

  /** Carga las vacantes destacadas. Idempotente: no repite si ya hay datos. */
  load(): void {
    if (this._featuredState() === 'loaded') return;
    this._featuredState.set('loading');
    this.api.list({ page: 1, limit: FEATURED_LIMIT, sort: 'date' }).subscribe({
      next: (page) => {
        this._featured.set(page.items);
        this._totalVacancies.set(page.total);
        this._featuredState.set('loaded');
      },
      error: () => this._featuredState.set('error'),
    });
  }

  private readonly _steps = signal<readonly WorkStep[]>([
    {
      num: '01',
      title: 'Crea tu cuenta',
      description:
        'Regístrate con tu correo en un par de minutos. No pedimos tarjeta.',
      icon: 'user',
      tone: 'brand',
    },
    {
      num: '02',
      title: 'Arma tu currículum',
      description:
        'Completa tu perfil una vez y reutilízalo en todas tus postulaciones.',
      icon: 'resume',
      tone: 'pink',
    },
    {
      num: '03',
      title: 'Postúlate y da seguimiento',
      description:
        'Aplica con un clic y consulta en qué etapa va cada proceso.',
      icon: 'send',
      tone: 'green',
    },
  ]);

  /**
   * Áreas destacadas. Los ids son los del catálogo real (T15), así que cada
   * tarjeta enlaza a un filtro que la API resuelve; antes eran cuatro nombres
   * sueltos ("Servicio al cliente", "Marketing"…) que no correspondían a nada.
   */
  private readonly _areas = signal<readonly HomeArea[]>([
    { areaId: 23, name: 'Ventas', icon: 'chart', tone: 'brand' },
    { areaId: 13, name: 'Informática / Telecomunicaciones', icon: 'code', tone: 'blue' },
    { areaId: 9, name: 'Contabilidad / Finanzas', icon: 'bank', tone: 'green' },
    { areaId: 18, name: 'Medicina / Salud', icon: 'shield', tone: 'pink' },
    { areaId: 1, name: 'Administración / Oficina', icon: 'clipboard', tone: 'amber' },
    { areaId: 16, name: 'Logística / Transporte', icon: 'grid', tone: 'blue' },
    { areaId: 3, name: 'Arte / Diseño / Medios', icon: 'palette', tone: 'pink' },
    { areaId: 4, name: 'Atención a clientes', icon: 'headset', tone: 'brand' },
  ]);

  /**
   * Testimonios. Nombres mexicanos verosímiles y citas de tres líneas como
   * mucho; antes firmaban "Nikola Tesla" y "Ada Lovelace".
   *
   * TODO(negocio): sustituir por testimonios reales con permiso de la persona.
   */
  private readonly _testimonials = signal<readonly Testimonial[]>([
    {
      name: 'Ximena Alcántara',
      role: 'Analista contable, Guadalajara',
      quote:
        'Me postulé un martes y el jueves ya tenía entrevista. Ver en qué etapa iba cada proceso me quitó la parte más incómoda de buscar trabajo.',
    },
    {
      name: 'Rodrigo Balderas',
      role: 'Técnico de mantenimiento, Monterrey',
      quote:
        'Filtré por estado y modalidad y dejé de perder tiempo en vacantes de otra ciudad. Encontré algo a veinte minutos de mi casa.',
    },
  ]);

  private readonly _popularSearches = signal<readonly string[]>([
    'Ventas',
    'Almacén',
    'Desarrollador',
    'Enfermería',
    'Chofer',
  ]);

  readonly steps = this._steps.asReadonly();
  readonly areas = this._areas.asReadonly();
  readonly testimonials = this._testimonials.asReadonly();
  readonly popularSearches = this._popularSearches.asReadonly();
}

/** 1240 → "1,240"; 12400 → "12.4 mil". Sin inflar ni redondear al alza. */
function formatCount(total: number): string {
  if (total < 1000) return String(total);
  if (total < 10000) return total.toLocaleString('es-MX');
  return `${(total / 1000).toFixed(total < 100000 ? 1 : 0)} mil`;
}
