import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ContactFacade } from '@/features/public/contact/data/contact.facade';
import { ContactFormValue } from '@/features/public/contact/models/contact.models';
import { ContactFormSection } from '@/features/public/contact/components/contact-form-section/contact-form-section';
import { ContactMap } from '@/features/public/contact/components/contact-map/contact-map';
import { BRAND_EMAILS } from '@/shared/catalogs/brand.catalogs';
import { IjPageHeader } from '@/shared/ui';
import { SeoService } from '@/core/services/seo.service';

/**
 * Container del feature de contacto.
 *
 * El formulario no tiene endpoint todavía, así que en vez de responder
 * "recibimos tu mensaje" (que era mentira: no se guardaba ni se enviaba nada)
 * compone un `mailto:` con asunto y cuerpo ya redactados y abre el gestor de
 * correo. El mensaje llega de verdad, y el día que exista el endpoint sólo
 * cambia este método.
 */
@Component({
  selector: 'app-contact-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjPageHeader, ContactFormSection, ContactMap],
  template: `
    <ij-page-header
      [title]="facade.hero().title"
      [lead]="facade.hero().description"
      breadcrumb="Contacto"
    />
    <app-contact-form-section
      [infoCards]="facade.infoCards()"
      [statusMessage]="statusMessage()"
      (formSubmitted)="onFormSubmitted($event)"
    />
    <app-contact-map [location]="facade.office()" />
  `,
})
export class ContactPage {
  protected readonly facade = inject(ContactFacade);
  protected readonly statusMessage = signal<string | null>(null);

  private readonly platformId = inject(PLATFORM_ID);

  constructor() {
    inject(SeoService).setPage({
      title: 'Contacto | Impulso Jobs',
      description:
        'Escríbenos por correo o teléfono si necesitas ayuda con vacantes, postulaciones o tu cuenta en Impulso Jobs.',
      canonicalPath: '/contacto',
    });
  }

  protected onFormSubmitted(value: ContactFormValue): void {
    const body = [
      `Nombre: ${value.name}`,
      `Correo: ${value.email}`,
      `Teléfono: ${value.phone}`,
      '',
      value.message,
    ].join('\n');

    const mailto =
      `mailto:${BRAND_EMAILS.general}` +
      `?subject=${encodeURIComponent(value.subject)}` +
      `&body=${encodeURIComponent(body)}`;

    if (isPlatformBrowser(this.platformId)) {
      window.location.href = mailto;
    }

    this.statusMessage.set(
      `Listo, ${value.name}: abrimos tu gestor de correo con el mensaje redactado. Si no se abrió, escríbenos a ${BRAND_EMAILS.general}.`,
    );
  }
}
