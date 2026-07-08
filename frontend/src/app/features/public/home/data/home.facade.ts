import { Injectable, signal } from '@angular/core';
import {
  Article,
  Company,
  JobCategory,
  JobListing,
  Stat,
  Testimonial,
  WorkStep,
} from '@/features/public/home/models/home.models';

/**
 * Facade de la home. Único punto del feature que expone el estado hacia el
 * container. Hoy sirve datos estáticos; cuando exista el contrato de API
 * (`@impulso/api-contract`) se reemplazará la fuente sin tocar los componentes.
 */
@Injectable({ providedIn: 'root' })
export class HomeFacade {
  private readonly _steps = signal<readonly WorkStep[]>([
    {
      num: '01',
      title: 'Crea tu cuenta',
      description:
        'Regístrate en minutos para encontrar el empleo que mejor se ajusta a tu perfil.',
      tone: 'brand',
    },
    {
      num: '02',
      title: 'Postúlate al empleo ideal',
      description:
        'Explora miles de vacantes y aplica a las que encajan con tu experiencia.',
      tone: 'pink',
    },
    {
      num: '03',
      title: 'Sube tu hoja de vida',
      description:
        'Deja que las empresas te encuentren manteniendo tu perfil siempre actualizado.',
      tone: 'green',
    },
  ]);

  private readonly _categories = signal<readonly JobCategory[]>([
    {
      icon: 'headset',
      jobsLabel: '1.000 empleos',
      name: 'Servicio al cliente',
      tone: 'brand',
    },
    {
      icon: 'bank',
      jobsLabel: '7.000 empleos',
      name: 'Finanzas y contabilidad',
      tone: 'green',
    },
    { icon: 'share', jobsLabel: '3.000 empleos', name: 'Marketing', tone: 'pink' },
    {
      icon: 'palette',
      jobsLabel: '2.100 empleos',
      name: 'Diseño y arte',
      tone: 'amber',
    },
  ]);

  private readonly _companies = signal<readonly Company[]>([
    { name: 'Innovación', icon: 'grid' },
    { name: 'Flash Tech', icon: 'flash' },
    { name: 'Digital', icon: 'orbit' },
    { name: 'Tecnología', icon: 'flash' },
    { name: 'Energía', icon: 'leaf' },
  ]);

  private readonly _jobs = signal<readonly JobListing[]>([
    {
      title: 'Diseñador y desarrollador web senior',
      posted: 'hace 7 días',
      logoText: 'C',
      logoTone: 'green',
      badge: 'Nuevo',
      badgeTone: 'green',
      salary: '$2.500',
      location: 'Calle 100 #15-20, Bogotá, Colombia',
      url: 'impulsojobs.com',
    },
    {
      title: 'Técnico senior de material rodante',
      posted: 'hace 15 días',
      logoText: 'B',
      logoTone: 'brand',
      badge: 'Prácticas',
      badgeTone: 'brand',
      salary: '$1.200',
      location: 'Calle 100 #15-20, Bogotá, Colombia',
      url: 'impulsojobs.com',
    },
    {
      title: 'Gerente de TI y bloguero',
      posted: 'hace 1 mes',
      logoText: 'E',
      logoTone: 'amber',
      badge: 'Tiempo completo',
      badgeTone: 'brand',
      salary: '$1.500',
      location: 'Calle 100 #15-20, Bogotá, Colombia',
      url: 'impulsojobs.com',
    },
    {
      title: 'Especialista en producción de arte',
      posted: 'hace 2 días',
      logoText: 'A',
      logoTone: 'pink',
      badge: 'Freelance',
      badgeTone: 'green',
      salary: '$1.200',
      location: 'Calle 100 #15-20, Bogotá, Colombia',
      url: 'impulsojobs.com',
    },
    {
      title: 'Trabajador de recreación y bienestar',
      posted: 'hace 7 días',
      logoText: 'R',
      logoTone: 'pink',
      badge: 'Temporal',
      badgeTone: 'amber',
      salary: '$1.700',
      location: 'Calle 100 #15-20, Bogotá, Colombia',
      url: 'impulsojobs.com',
    },
  ]);

  private readonly _testimonials = signal<readonly Testimonial[]>([
    {
      name: 'Nikola Tesla',
      role: 'Contador',
      quote:
        'Conseguí el empleo al que apliqué a través de Impulso Jobs. Usé la plataforma durante toda mi búsqueda laboral.',
    },
    {
      name: 'Ada Lovelace',
      role: 'Ingeniera de software',
      quote:
        'Una experiencia muy sencilla: creé mi perfil, me postulé y en pocas semanas ya tenía entrevistas.',
    },
  ]);

  private readonly _articles = signal<readonly Article[]>([
    {
      author: 'Mark Petter',
      title: 'Cómo convencer a los reclutadores y conseguir el empleo de tus sueños',
      date: '06 de marzo, 2026',
      excerpt:
        'Consejos prácticos para destacar tu perfil y superar cada etapa del proceso de selección.',
    },
    {
      author: 'David Wish',
      title: '8 cosas que debes saber sobre el informe de empleo de 2026',
      date: '02 de marzo, 2026',
      excerpt:
        'Un análisis de las tendencias del mercado laboral y qué sectores están contratando más.',
    },
    {
      author: 'Mike Doe',
      title: 'Los portales de empleo, un sector clave en el mundo actual',
      date: '28 de febrero, 2026',
      excerpt:
        'Por qué la tecnología de reclutamiento transforma la forma en que encontramos trabajo.',
    },
  ]);

  private readonly _heroStats = signal<readonly Stat[]>([
    { value: '12K+', label: 'Empleos de empresas', icon: 'building', tone: 'brand' },
    { value: '98+', label: 'Países con empleo', icon: 'globe', tone: 'green' },
    { value: '3K+', label: 'Contrataciones' },
  ]);

  private readonly _platformStats = signal<readonly Stat[]>([
    { value: '10M+', label: 'Usuarios activos al día' },
    { value: '1K+', label: 'Vacantes abiertas' },
    { value: '50M+', label: 'Historias compartidas' },
  ]);

  private readonly _popularSearches = signal<readonly string[]>([
    'Desarrollador',
    'Diseñador',
    'Arquitecto',
    'Ingeniero',
  ]);

  readonly steps = this._steps.asReadonly();
  readonly categories = this._categories.asReadonly();
  readonly companies = this._companies.asReadonly();
  readonly jobs = this._jobs.asReadonly();
  readonly testimonials = this._testimonials.asReadonly();
  readonly articles = this._articles.asReadonly();
  readonly heroStats = this._heroStats.asReadonly();
  readonly platformStats = this._platformStats.asReadonly();
  readonly popularSearches = this._popularSearches.asReadonly();
}
