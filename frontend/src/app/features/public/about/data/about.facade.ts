import { Injectable, signal } from '@angular/core';
import { MX_STATES } from '@/shared/catalogs/mx.catalogs';
import { PROFESSIONAL_AREAS } from '@/shared/catalogs/professional-areas.catalogs';
import {
  AboutAudience,
  AboutCtaContent,
  AboutFact,
  AboutHeroContent,
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
 * TODO(negocio): falta la parte que sólo la empresa puede escribir (historia,
 * misión, equipo). Cuando exista, entra como una sección más entre el hero y
 * "para quién es".
 */
@Injectable({ providedIn: 'root' })
export class AboutFacade {
  private readonly _hero = signal<AboutHeroContent>({
    title: 'Una bolsa de trabajo hecha para México',
    lead: 'Impulso Jobs conecta a quien busca empleo con las empresas que contratan, con filtros que entienden cómo se busca trabajo aquí: por área, por estado y por modalidad.',
    breadcrumbLabel: 'Nosotros',
  });

  private readonly _audiences = signal<readonly AboutAudience[]>([
    {
      icon: 'user',
      tone: 'brand',
      title: 'Si buscas empleo',
      description:
        'Todo el lado del candidato es gratuito, incluidas las postulaciones.',
      features: [
        'Filtra por área, estado, modalidad, experiencia y salario mínimo',
        'Un solo currículum para todas tus postulaciones',
        'Consulta en qué etapa va cada proceso',
        'Guarda vacantes para decidir después',
        'Decide si tu perfil es visible para las empresas',
      ],
      ctaLabel: 'Crear cuenta gratis',
      ctaPath: '/auth/registro',
    },
    {
      icon: 'building',
      tone: 'green',
      title: 'Si contratas',
      description:
        'Publica, filtra y ordena tus procesos desde un panel propio.',
      features: [
        'Preguntas de descarte para filtrar antes de entrevistar',
        'El currículum queda congelado tal como estaba al postularse',
        'Vacantes destacadas y distintivos por periodo',
        'Varios usuarios por empresa, con permisos por rol',
        'Facturación con datos fiscales y uso de CFDI',
      ],
      ctaLabel: 'Publicar una vacante',
      ctaPath: '/auth/registro/empresa',
    },
  ]);

  private readonly _steps = signal<readonly AboutStep[]>([
    {
      num: '01',
      title: 'Crea tu cuenta',
      description:
        'Regístrate con tu correo. No pedimos tarjeta ni datos de pago.',
      icon: 'user',
      tone: 'brand',
    },
    {
      num: '02',
      title: 'Arma tu currículum',
      description:
        'Experiencia, estudios e idiomas. Se completa una vez y se reutiliza.',
      icon: 'resume',
      tone: 'amber',
    },
    {
      num: '03',
      title: 'Encuentra la vacante',
      description:
        'Filtra por área, estado y modalidad, u ordena por fecha o salario.',
      icon: 'search',
      tone: 'pink',
    },
    {
      num: '04',
      title: 'Postúlate y da seguimiento',
      description:
        'Aplica con un clic y consulta el avance de cada proceso en tu panel.',
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
      label: 'Áreas profesionales',
      detail:
        'Desde producción y logística hasta salud, ingeniería o ventas.',
    },
    {
      value: String(MX_STATES.length),
      label: 'Estados de la república',
      detail: 'Cobertura nacional, con filtro por estado y municipio.',
    },
    {
      value: '$0',
      label: 'Costo para el candidato',
      detail: 'Crear cuenta, armar tu currículum y postularte no cuesta nada.',
    },
  ]);

  private readonly _cta = signal<AboutCtaContent>({
    title: 'Empieza por donde te toque',
    description:
      'Si buscas trabajo, crear tu cuenta toma un par de minutos. Si contratas, puedes publicar tu primera vacante hoy mismo.',
  });

  readonly hero = this._hero.asReadonly();
  readonly audiences = this._audiences.asReadonly();
  readonly steps = this._steps.asReadonly();
  readonly facts = this._facts.asReadonly();
  readonly cta = this._cta.asReadonly();
}
