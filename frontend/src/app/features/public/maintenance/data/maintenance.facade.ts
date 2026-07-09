import { Injectable, signal } from '@angular/core';
import {
  MaintenanceContent,
  MaintenanceSocialLink,
} from '@/features/public/maintenance/models/maintenance.models';

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

  private readonly _socials = signal<readonly MaintenanceSocialLink[]>([
    {
      label: 'Facebook',
      href: 'https://www.facebook.com/',
      path: 'M14 9V7c0-1 .3-1.5 1.6-1.5H17V2.5h-2.4C11.7 2.5 11 4.3 11 6.6V9H8.5v3H11v9.5h3V12h2.3l.4-3z',
    },
    {
      label: 'X',
      href: 'https://x.com/',
      path: 'M17.5 3h2.8l-6.1 7 7.2 9.5h-5.6l-4.4-5.8L6.2 19.5H3.4l6.5-7.5L3 3h5.7l4 5.3z',
    },
    {
      label: 'LinkedIn',
      href: 'https://www.linkedin.com/',
      path: 'M6.9 8.5H3.7v11.8h3.2zM5.3 3.2A1.9 1.9 0 1 0 5.3 7a1.9 1.9 0 0 0 0-3.8zM20.3 20.3h-3.2v-5.7c0-1.4 0-3.2-1.9-3.2s-2.2 1.5-2.2 3.1v5.8H9.8V8.5h3v1.6h.1c.5-.8 1.5-1.7 3.1-1.7 3.3 0 3.9 2.2 3.9 5z',
    },
    {
      label: 'Pinterest',
      href: 'https://www.pinterest.com/',
      path: 'M12 2C6.5 2 4 5.7 4 9c0 2 .8 3.8 2.4 4.4.3.1.5 0 .5-.3l.2-.9c.1-.3 0-.4-.2-.6-.5-.6-.8-1.3-.8-2.4 0-3 2.3-5.7 5.9-5.7 3.2 0 5 2 5 4.6 0 3.5-1.5 6.4-3.8 6.4-1.3 0-2.2-1-1.9-2.3.4-1.5 1-3 1-4.1 0-1-.5-1.8-1.6-1.8-1.3 0-2.3 1.3-2.3 3.1 0 1.1.4 1.9.4 1.9l-1.5 6.4c-.4 1.9-.1 4.2 0 4.4 0 .1.2.2.3.1.1-.2 1.9-2.3 2.5-4.5l.9-3.6c.5.9 1.8 1.6 3.1 1.6 4.1 0 6.9-3.7 6.9-8.7C20.9 5.3 17.8 2 12 2z',
    },
  ]);

  readonly content = this._content.asReadonly();
  readonly socials = this._socials.asReadonly();
}
