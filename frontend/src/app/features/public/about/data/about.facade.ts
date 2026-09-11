import { Injectable, signal } from '@angular/core';
import { MX_STATES } from '@/shared/catalogs/mx.catalogs';
import { PROFESSIONAL_AREAS } from '@/shared/catalogs/professional-areas.catalogs';
import {
  AboutAudience,
  AboutFact,
  AboutStep,
} from '@/features/public/about/models/about.models';

/**
 * Facade de "Nosotros".
 *
 * La página anterior no hablaba de la empresa: era una rejilla de categorías
 * inventadas ("9,185 empleos" repetido en cuatro tarjetas), un muro de logos
 * falsos con el texto "TU MARCA AQUÍ" impreso debajo, y un CTA cuya imagen
 * apuntaba a la API interna de text-to-image de una herramienta de desarrollo.
 *
 * Lo que queda describe lo que el producto hace de verdad, y las cifras de
 * cobertura se cuentan de los catálogos en tiempo de ejecución, así que no
 * pueden quedar desfasadas.
 *
 * El texto va por clave de traducción (T26); el hero y el cierre no pasan por
 * aquí porque no tienen más dato que su propio texto.
 *
 * TODO(negocio): falta la parte que sólo la empresa puede escribir (historia,
 * misión, equipo). Cuando exista, entra como una sección más entre el hero y
 * "para quién es".
 */
@Injectable({ providedIn: 'root' })
export class AboutFacade {
  private readonly _audiences = signal<readonly AboutAudience[]>([
    {
      icon: 'user',
      tone: 'brand',
      titleKey: 'about.candidates.title',
      descriptionKey: 'about.candidates.description',
      featureKeys: [
        'about.candidates.f1',
        'about.candidates.f2',
        'about.candidates.f3',
        'about.candidates.f4',
        'about.candidates.f5',
      ],
      ctaLabelKey: 'about.candidates.cta',
      ctaPath: '/auth/registro',
    },
    {
      icon: 'building',
      tone: 'green',
      titleKey: 'about.companies.title',
      descriptionKey: 'about.companies.description',
      featureKeys: [
        'about.companies.f1',
        'about.companies.f2',
        'about.companies.f3',
        'about.companies.f4',
        'about.companies.f5',
      ],
      ctaLabelKey: 'about.companies.cta',
      ctaPath: '/auth/registro/empresa',
    },
  ]);

  private readonly _steps = signal<readonly AboutStep[]>([
    {
      num: '01',
      titleKey: 'about.steps.account.title',
      descriptionKey: 'about.steps.account.description',
      icon: 'user',
      tone: 'brand',
    },
    {
      num: '02',
      titleKey: 'about.steps.resume.title',
      descriptionKey: 'about.steps.resume.description',
      icon: 'resume',
      tone: 'amber',
    },
    {
      num: '03',
      titleKey: 'about.steps.search.title',
      descriptionKey: 'about.steps.search.description',
      icon: 'search',
      tone: 'pink',
    },
    {
      num: '04',
      titleKey: 'about.steps.apply.title',
      descriptionKey: 'about.steps.apply.description',
      icon: 'send',
      tone: 'green',
    },
  ]);

  /**
   * Cifras de cobertura. Se cuentan de los catálogos, no se escriben a mano:
   * si mañana el catálogo de áreas crece, la página lo refleja sola.
   */
  private readonly _facts = signal<readonly AboutFact[]>([
    {
      value: String(PROFESSIONAL_AREAS.length),
      labelKey: 'about.facts.areas.label',
      detailKey: 'about.facts.areas.detail',
    },
    {
      value: String(MX_STATES.length),
      labelKey: 'about.facts.states.label',
      detailKey: 'about.facts.states.detail',
    },
    {
      value: '$0',
      labelKey: 'about.facts.free.label',
      detailKey: 'about.facts.free.detail',
    },
  ]);

  readonly audiences = this._audiences.asReadonly();
  readonly steps = this._steps.asReadonly();
  readonly facts = this._facts.asReadonly();
}
