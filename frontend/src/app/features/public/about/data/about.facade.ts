import { Injectable, signal } from '@angular/core';
import {
  AboutCategory,
  AboutCompany,
  AboutCtaContent,
  AboutHeroContent,
  AboutStep,
} from '@/features/public/about/models/about.models';

/**
 * Facade del feature "nosotros". Mantiene el contenido desacoplado de la vista
 * para facilitar futuros cambios desde API o CMS.
 */
@Injectable({ providedIn: 'root' })
export class AboutFacade {
  private readonly _hero = signal<AboutHeroContent>({
    title: 'Nosotros',
    breadcrumbLabel: 'Nosotros',
  });

  private readonly _categories = signal<readonly AboutCategory[]>([
    { jobsLabel: '9,185 empleos', name: 'Desarrollo de negocios', icon: 'chart', tone: 'brand' },
    { jobsLabel: '3,205 empleos', name: 'Gestion de proyectos', icon: 'clipboard', tone: 'brand' },
    { jobsLabel: '2,100 empleos', name: 'Redaccion de contenido', icon: 'pen', tone: 'brand' },
    { jobsLabel: '1,500 empleos', name: 'Servicio al cliente', icon: 'headset', tone: 'brand', featured: true },
    { jobsLabel: '9,185 empleos', name: 'Finanzas', icon: 'bank', tone: 'brand' },
    { jobsLabel: '3,205 empleos', name: 'Marketing', icon: 'share', tone: 'brand' },
    { jobsLabel: '2,100 empleos', name: 'Diseno y arte', icon: 'palette', tone: 'brand' },
    { jobsLabel: '1,500 empleos', name: 'Desarrollo web', icon: 'code', tone: 'brand' },
  ]);

  private readonly _bullets = signal<readonly string[]>([
    'Vacantes confiables y de calidad',
    'Oportunidades nacionales e internacionales',
    'Sin costos ocultos para candidatos',
    'Empresas destacadas en un solo lugar',
  ]);

  private readonly _steps = signal<readonly AboutStep[]>([
    {
      num: '01',
      title: 'Crea tu cuenta',
      description: 'Registrate para acceder a vacantes, empresas y herramientas de perfil profesional.',
      icon: 'clipboard',
      tone: 'brand',
    },
    {
      num: '02',
      title: 'Encuentra tu empleo',
      description: 'Filtra por categoria, experiencia o modalidad para descubrir oportunidades relevantes.',
      icon: 'search',
      tone: 'amber',
      shifted: true,
    },
    {
      num: '03',
      title: 'Postúlate fácil',
      description: 'Aplica a tus vacantes favoritas en pocos pasos y haz seguimiento a tu proceso.',
      icon: 'resume',
      tone: 'pink',
    },
    {
      num: '04',
      title: 'Sube tu hoja de vida',
      description: 'Haz visible tu perfil para que grandes empresas te encuentren mas rapido.',
      icon: 'arrow-up',
      tone: 'green',
      shifted: true,
    },
  ]);

  private readonly _cta = signal<AboutCtaContent>({
    eyebrow: 'Explora una nueva etapa',
    title:
      'No solo busques. Deja que te encuentren y pon tu perfil frente a grandes empleadores',
    description:
      'Crea tu perfil, sube tu hoja de vida y recibe oportunidades de empresas que estan contratando talento como el tuyo.',
    buttonLabel: 'Sube tu hoja de vida',
    imageSrc:
      'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=professional%20Latina%20woman%20in%20smart%20business%20casual%20holding%20documents%2C%20standing%20confidently%20in%20a%20bright%20modern%20office%2C%20realistic%20corporate%20recruitment%20photography%2C%20soft%20natural%20light%2C%20clean%20background%2C%20full%20body%20portrait%2C%20high-end%20website%20hero%20image&image_size=portrait_4_3',
    imageAlt: 'Profesional sosteniendo documentos en una oficina moderna',
  });

  private readonly _companies = signal<readonly AboutCompany[]>([
    { name: 'Green Power', icon: 'leaf' },
    { name: 'Innovation', icon: 'grid' },
    { name: 'Flash Tech', icon: 'flash' },
    { name: 'Digital', icon: 'orbit' },
    { name: 'Technology', icon: 'flash' },
    { name: 'Energy', icon: 'orbit' },
  ]);

  readonly hero = this._hero.asReadonly();
  readonly categories = this._categories.asReadonly();
  readonly bullets = this._bullets.asReadonly();
  readonly steps = this._steps.asReadonly();
  readonly cta = this._cta.asReadonly();
  readonly companies = this._companies.asReadonly();
}
