import { Injectable, signal } from '@angular/core';
import {
  BRAND_ADDRESS_LINE,
  BRAND_EMAILS,
  BRAND_OFFICE,
  BRAND_PHONES,
} from '@/shared/catalogs/brand.catalogs';
import {
  ContactHeroContent,
  ContactInfoCard,
  ContactMapLocation,
} from '@/features/public/contact/models/contact.models';

/**
 * Facade del feature de contacto.
 *
 * Los datos salen de `brand.catalogs.ts`, que es el único sitio donde viven la
 * dirección, los teléfonos y los correos. Antes esta página situaba la oficina
 * en Bogotá con teléfonos +57, mientras el footer daba una dirección distinta y
 * el producto entero es de México.
 */
@Injectable({ providedIn: 'root' })
export class ContactFacade {
  private readonly _hero = signal<ContactHeroContent>({
    eyebrow: 'Contacto',
    title: 'Hablemos de tu próxima contratación',
    description:
      'Escríbenos si necesitas ayuda publicando vacantes, gestionando candidatos o resolviendo dudas sobre la plataforma.',
  });

  private readonly _infoCards = signal<readonly ContactInfoCard[]>([
    {
      icon: 'mail',
      title: 'Correo',
      lines: [BRAND_EMAILS.general, BRAND_EMAILS.companies],
      hrefs: [`mailto:${BRAND_EMAILS.general}`, `mailto:${BRAND_EMAILS.companies}`],
    },
    {
      icon: 'phone',
      title: 'Teléfono y WhatsApp',
      lines: [BRAND_PHONES.office, BRAND_PHONES.mobile],
      hrefs: [
        `tel:${BRAND_PHONES.office.replace(/\s+/g, '')}`,
        `tel:${BRAND_PHONES.mobile.replace(/\s+/g, '')}`,
      ],
    },
    {
      icon: 'map-pin',
      title: 'Oficina',
      lines: [BRAND_OFFICE.street, `${BRAND_OFFICE.locality}, ${BRAND_OFFICE.city}`],
      hrefs: [],
    },
  ]);

  private readonly _office = signal<ContactMapLocation>({
    officeName: 'Impulso Jobs',
    address: BRAND_ADDRESS_LINE,
    lat: BRAND_OFFICE.lat,
    lng: BRAND_OFFICE.lng,
  });

  readonly hero = this._hero.asReadonly();
  readonly infoCards = this._infoCards.asReadonly();
  readonly office = this._office.asReadonly();
}
