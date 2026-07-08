import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ContactFacade } from '@/features/public/contact/data/contact.facade';
import { ContactFormValue } from '@/features/public/contact/models/contact.models';
import { ContactHero } from '@/features/public/contact/components/contact-hero/contact-hero';
import { ContactFormSection } from '@/features/public/contact/components/contact-form-section/contact-form-section';
import { ContactMap } from '@/features/public/contact/components/contact-map/contact-map';

/**
 * Container del feature de contacto. Orquesta el contenido y reacciona al envío
 * del formulario sin acoplarse todavía a una integración backend.
 */
@Component({
  selector: 'app-contact-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ContactHero, ContactFormSection, ContactMap],
  template: `
    <app-contact-hero [content]="facade.hero()" />
    <app-contact-form-section
      [infoCards]="facade.infoCards()"
      [successMessage]="successMessage()"
      (formSubmitted)="onFormSubmitted($event)"
    />
    <app-contact-map [location]="facade.office()" />
  `,
})
export class ContactPage {
  protected readonly facade = inject(ContactFacade);
  protected readonly successMessage = signal<string | null>(null);

  protected onFormSubmitted(value: ContactFormValue): void {
    this.successMessage.set(
      `Gracias, ${value.name}. Recibimos tu mensaje sobre "${value.subject}" y te responderemos en breve.`,
    );
  }
}
