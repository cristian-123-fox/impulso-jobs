import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TranslocoDirective } from '@jsverse/transloco';
import { AppTranslateService } from '@/core/i18n/app-translate.service';
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
  imports: [IjPageHeader, ContactFormSection, ContactMap, TranslocoDirective],
  template: `
    <ng-container *transloco="let t">
      <ij-page-header
        [title]="t('contact.hero.title')"
        [lead]="t('contact.hero.description')"
        [breadcrumb]="t('contact.hero.breadcrumb')"
      />
    </ng-container>
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

  /**
   * Nombre de quien acaba de enviar, no el aviso ya redactado: guardarlo hecho
   * dejaría el mensaje en el idioma que hubiera al pulsar Enviar (T26).
   */
  private readonly sentBy = signal<string | null>(null);

  protected readonly statusMessage = computed(() => {
    const name = this.sentBy();
    return name
      ? this.i18n.t('contact.status', { name, email: BRAND_EMAILS.general })
      : null;
  });

  private readonly platformId = inject(PLATFORM_ID);
  private readonly i18n = inject(AppTranslateService);

  constructor() {
    inject(SeoService).setLocalizedPage({
      titleKey: 'seo.contact.title',
      descriptionKey: 'seo.contact.description',
      canonicalPath: '/contacto',
    });
  }

  protected onFormSubmitted(value: ContactFormValue): void {
    // El borrador se redacta en el idioma del portal: quien lo va a ver en su
    // gestor de correo antes de enviarlo es el propio usuario.
    const t = (key: string) => this.i18n.t(`contact.mailto.${key}`);
    const body = [
      `${t('name')}: ${value.name}`,
      `${t('email')}: ${value.email}`,
      `${t('phone')}: ${value.phone}`,
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

    this.sentBy.set(value.name);
  }
}
