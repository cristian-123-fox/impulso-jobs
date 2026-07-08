import { Injectable, signal } from '@angular/core';
import {
  ContactHeroContent,
  ContactInfoCard,
  ContactMapLocation,
} from '@/features/public/contact/models/contact.models';

/**
 * Facade del feature de contacto. Expone el contenido estático de la página
 * para desacoplar la vista de la futura integración con API o CMS.
 */
@Injectable({ providedIn: 'root' })
export class ContactFacade {
  private readonly _hero = signal<ContactHeroContent>({
    eyebrow: 'Contacto',
    title: 'Hablemos sobre tu próxima contratación',
    description:
      'Escríbenos si necesitas ayuda publicando vacantes, gestionando candidatos o resolviendo dudas sobre la plataforma.',
  });

  private readonly _infoCards = signal<readonly ContactInfoCard[]>([
    {
      icon: 'map-pin',
      title: 'Visítanos en Bogotá',
      lines: ['Cra. 15 #93-47, Oficina 402', 'Bogotá, Colombia'],
    },
    {
      icon: 'phone',
      title: 'Llámanos o escríbenos',
      lines: ['+57 601 555 1234', '+57 320 555 9876'],
    },
    {
      icon: 'mail',
      title: 'Soporte y ventas',
      lines: ['hola@impulsojobs.com', 'empresas@impulsojobs.com'],
    },
  ]);

  private readonly _office = signal<ContactMapLocation>({
    badgeTitle: 'Oficina principal',
    badgeAddress: 'Cra. 15 #93-47, Bogotá, Colombia',
    officeName: 'Impulso Jobs Hub',
    officeAddress: 'Zona financiera, Chapinero, Bogotá',
  });

  readonly hero = this._hero.asReadonly();
  readonly infoCards = this._infoCards.asReadonly();
  readonly office = this._office.asReadonly();
}
