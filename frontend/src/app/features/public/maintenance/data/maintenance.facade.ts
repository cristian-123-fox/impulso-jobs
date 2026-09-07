import { Injectable, signal } from '@angular/core';
import {
  MaintenanceContent,
  MaintenanceSocialLink,
} from '@/features/public/maintenance/models/maintenance.models';
import { SOCIAL_LINKS } from '@/shared/catalogs/social.catalogs';

/**
 * Centraliza el contenido estático de la vista de mantenimiento para poder
 * reemplazarlo por configuración remota sin tocar la presentación.
 */
@Injectable({ providedIn: 'root' })
export class MaintenanceFacade {
  private readonly _content = signal<MaintenanceContent>({
    eyebrow: 'El sitio está en',
    titleLead: 'Modo',
    titleAccent: 'Mantenimiento',
    description:
      'Estamos realizando ajustes para mejorar tu experiencia. Volveremos a estar disponibles muy pronto.',
  });

  /**
   * Las marcas salen del catálogo compartido (trazados oficiales de Simple
   * Icons). Antes esta vista llevaba sus propios SVG redibujados a ojo, que no
   * coincidían con ningún logo real, e incluía Pinterest, que no pinta nada en
   * una bolsa de trabajo.
   */
  private readonly _socials = signal<readonly MaintenanceSocialLink[]>(
    SOCIAL_LINKS,
  );

  readonly content = this._content.asReadonly();
  readonly socials = this._socials.asReadonly();
}
