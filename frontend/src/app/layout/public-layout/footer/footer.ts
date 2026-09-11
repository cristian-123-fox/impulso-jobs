import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { IjButton, IjLogo } from '@/shared/ui';
import { SOCIAL_LINKS } from '@/shared/catalogs/social.catalogs';
import {
  BRAND_EMAILS,
  BRAND_OFFICE,
  BRAND_PHONES,
  telHref,
} from '@/shared/catalogs/brand.catalogs';

interface FooterLink {
  /** Clave de traducción; el texto se resuelve en la plantilla. */
  readonly labelKey: string;
  readonly path: string;
}

interface FooterColumn {
  readonly titleKey: string;
  readonly links: readonly FooterLink[];
}

/** Pie de página del portal público: newsletter, columnas de enlaces y socials. */
@Component({
  selector: 'app-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjLogo, IjButton, RouterLink, TranslocoDirective],
  template: `
    <footer *transloco="let t" class="bg-ink-950 px-6 pb-10 text-footer-fg lg:px-[60px]">
      <!-- Newsletter -->
      <div class="mx-auto max-w-[1120px] -translate-y-10">
        <div
          class="flex flex-wrap items-center justify-between gap-8 rounded-xl bg-ink-card px-6 py-8 sm:px-11"
        >
          <p class="max-w-[420px] text-xl font-semibold leading-snug text-white">
            {{ t('footer.newsletter.title') }}
          </p>
          <form
            class="min-w-[280px] max-w-[520px] flex-1"
            (submit)="onSubscribe($event)"
            novalidate
          >
            <div class="flex gap-3">
              <label class="flex-1">
                <span class="sr-only">{{ t('footer.newsletter.emailLabel') }}</span>
                <input
                  type="email"
                  name="email"
                  autocomplete="email"
                  [placeholder]="t('footer.newsletter.placeholder')"
                  class="w-full rounded-lg border-0 px-4 py-3.5 text-sm text-body placeholder:text-muted focus:ring-2 focus:ring-brand-700"
                />
              </label>
              <button ij-button type="submit" shape="rounded">
                {{ t('footer.newsletter.submit') }}
              </button>
            </div>
            <!--
              El alta aún no tiene endpoint (no hay módulo de notificaciones ni
              SMTP: MAILER_PORT sigue apuntando a ConsoleMailerAdapter). Se
              dice, en vez de fingir un envío que nunca ocurre.
            -->
            <p
              class="mt-2.5 text-[13px] text-footer-muted"
              [class.text-white]="submitted()"
              aria-live="polite"
            >
              @if (submitted()) {
                {{ t('footer.newsletter.pending') }}
              } @else {
                {{ t('footer.newsletter.hint') }}
              }
            </p>
          </form>
        </div>
      </div>

      <!-- Columnas -->
      <div
        class="mx-auto grid max-w-[1120px] gap-8 pt-2 sm:grid-cols-2 lg:grid-cols-[1.6fr_repeat(3,1fr)]"
      >
        <div>
          <ij-logo variant="light" size="sm" />
          <p class="mb-4 mt-5 max-w-[280px] text-sm leading-relaxed text-footer-muted">
            {{ t('footer.tagline') }}
          </p>
          <address class="text-[13px] not-italic leading-[1.9] text-footer-muted">
            <span class="font-medium text-white">{{ t('footer.addressLabel') }}</span>
            {{ office.street }}, {{ office.locality }},<br />
            {{ office.city }}<br />
            <span class="font-medium text-white">{{ t('footer.emailLabel') }}</span>
            <a
              [href]="'mailto:' + emails.general"
              class="transition-colors hover:text-white"
              >{{ emails.general }}</a
            ><br />
            <span class="font-medium text-white">{{ t('footer.phoneLabel') }}</span>
            <a [href]="telHref(phones.office)" class="transition-colors hover:text-white">{{
              phones.office
            }}</a>
          </address>
        </div>

        @for (col of columns; track col.titleKey) {
          <div>
            <h2 class="mb-5 text-base font-semibold text-white">{{ t(col.titleKey) }}</h2>
            <div class="flex flex-col gap-2.5">
              @for (link of col.links; track link.path) {
                <a
                  [routerLink]="link.path"
                  class="text-sm text-footer-muted transition-colors hover:text-white"
                  >{{ t(link.labelKey) }}</a
                >
              }
            </div>
          </div>
        }
      </div>

      <!-- Barra inferior -->
      <div
        class="mx-auto mt-10 flex max-w-[1120px] flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6"
      >
        <p class="text-[13px] text-footer-muted">
          {{ t('footer.rights', { year }) }}
        </p>
        <div class="flex gap-2.5">
          @for (social of socials; track social.label) {
            <a
              [href]="social.href"
              target="_blank"
              rel="noopener noreferrer"
              [attr.aria-label]="social.label"
              class="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-brand-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950"
            >
              <svg viewBox="0 0 24 24" class="h-4 w-4 fill-current" aria-hidden="true">
                <path [attr.d]="social.path" />
              </svg>
            </a>
          }
        </div>
      </div>
    </footer>
  `,
})
export class Footer {
  /** Se calcula, no se fija: un año escrito a mano envejece solo. */
  protected readonly year = new Date().getFullYear();

  protected readonly office = BRAND_OFFICE;
  protected readonly emails = BRAND_EMAILS;
  protected readonly phones = BRAND_PHONES;
  protected readonly socials = SOCIAL_LINKS;
  protected readonly telHref = telHref;

  protected readonly submitted = signal(false);

  /**
   * Cuatro columnas de enlaces se volvían dos listas de "Enlaces" repetidos
   * (Inicio, Empresas y Contacto salían dos veces). Quedan tres, sin duplicados.
   * Todos apuntan a rutas que existen en `app.routes.ts`; antes eran `href="#"`.
   */
  protected readonly columns: readonly FooterColumn[] = [
    {
      titleKey: 'footer.columns.candidates',
      links: [
        { labelKey: 'footer.links.searchJobs', path: '/vacantes' },
        { labelKey: 'footer.links.createAccount', path: '/auth/registro' },
        { labelKey: 'footer.links.myProfile', path: '/candidato/perfil' },
        { labelKey: 'footer.links.myApplications', path: '/candidato/postulaciones' },
        { labelKey: 'footer.links.savedJobs', path: '/candidato/guardadas' },
      ],
    },
    {
      titleKey: 'footer.columns.companies',
      links: [
        { labelKey: 'footer.links.postJob', path: '/auth/registro/empresa' },
        { labelKey: 'footer.links.pricing', path: '/planes' },
        { labelKey: 'footer.links.myVacancies', path: '/empresa/vacantes' },
        { labelKey: 'footer.links.searchTalent', path: '/empresa/candidatos' },
      ],
    },
    {
      titleKey: 'footer.columns.brand',
      links: [
        { labelKey: 'footer.links.about', path: '/nosotros' },
        { labelKey: 'footer.links.faq', path: '/faq' },
        { labelKey: 'footer.links.contact', path: '/contacto' },
      ],
    },
  ];

  protected onSubscribe(event: Event): void {
    event.preventDefault();
    this.submitted.set(true);
  }
}
