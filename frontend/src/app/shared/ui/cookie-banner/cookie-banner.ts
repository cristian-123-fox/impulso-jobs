import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { ConsentService } from '@/core/consent/consent.service';
import {
  COOKIE_CATEGORIES,
  COOKIES,
  type CookieCategory,
  type CookiePreferences,
} from '@/core/consent/consent.config';
import { LegalConsentFacade } from '@/features/public/legal/data/legal-consent.facade';
import { legalDocument, LegalDocCode } from '@/shared/catalogs/legal.catalogs';
import { IjButton } from '@/shared/ui';

/**
 * Banner de cookies y tecnologías de recabado automático.
 *
 * ## Por qué está aquí y no es una librería
 *
 * En México no hay ley de cookies. Lo que obliga es el artículo 14, párrafo
 * tercero, del Reglamento de la LFPDPPP: informar **en el momento** del uso de
 * mecanismos que recaban datos de forma automática y **cómo se pueden
 * deshabilitar**. Una librería traída de Europa resolvería un problema que aquí
 * no existe y crearía otro: 40 kB de JavaScript de terceros para mostrar un
 * aviso que además hay que escribir a mano porque el artículo 16 pide una
 * *modalidad simplificada* del aviso en el punto de recabado.
 *
 * ## Las tres reglas que lo hacen lawful
 *
 * 1. **Rechazar es tan fácil como aceptar.** Mismo número de clics, misma
 *    posición en la barra. Un "rechazar" escondido tras un "preferencias" es la
 *    carga previa que el art. 15 fr. IV de la LFPDPPP prohíbe en la práctica.
 * 2. **Nada se carga antes de responder.** `ThirdPartyGateService` lo impide, y
 *    sólo las categorías marcadas se encienden después.
 * 3. **Se puede volver atrás.** El enlace "cambiar preferencias" de la Política
 *    de cookies reabre este mismo banner; sin él no habría forma de deshacer una
 *    decisión, que es justo lo que el mismo artículo 14 exige ofrecer.
 */
@Component({
  selector: 'ij-cookie-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective, RouterLink, IjButton],
  template: `
    @if (consent.showBanner()) {
      <aside
        class="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-white shadow-[0_-8px_24px_rgba(20,26,46,0.12)]"
        role="dialog"
        aria-modal="false"
        [attr.aria-label]="t('legal.cookies.banner.title')"
        *transloco="let t"
      >
        <div class="mx-auto max-w-container px-6 py-5 lg:px-[60px]">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-8">
            <div class="flex-1">
              <h2 class="text-base font-semibold text-ink">
                {{ t('legal.cookies.banner.title') }}
              </h2>
              <p class="mt-1.5 text-sm leading-relaxed text-body">
                {{ t('legal.cookies.banner.body') }}
                <a
                  [routerLink]="policyRoute"
                  target="_blank"
                  rel="noopener"
                  class="font-medium text-ink underline decoration-line underline-offset-2 hover:decoration-ink"
                  >{{ t(policyTitleKey) }}</a
                >
              </p>

              @if (expanded()) {
                <ul class="mt-4 flex flex-col gap-3 border-t border-line pt-4">
                  @for (category of categories; track category) {
                    <li class="flex items-start justify-between gap-4">
                      <div class="flex-1">
                        <p class="text-sm font-medium text-ink">
                          {{ t('legal.cookies.categories.' + category) }}
                          @if (isLocked(category)) {
                            <span class="ml-1 text-xs font-normal text-muted">
                              ({{ t('legal.cookies.alwaysOn') }})
                            </span>
                          }
                        </p>
                        <ul class="mt-1 flex flex-col gap-0.5">
                          @for (cookie of cookiesOf(category); track cookie.id) {
                            <li class="text-xs leading-relaxed text-muted">
                              <span class="font-medium text-body">{{ cookie.name }}</span>
                              — {{ cookie.provider }}. {{ t('legal.cookies.purpose.' + cookie.id) }}
                            </li>
                          }
                        </ul>
                      </div>
                      <label class="flex shrink-0 items-center gap-2 pt-0.5">
                        <input
                          type="checkbox"
                          class="h-4 w-4 rounded border-line text-brand focus:ring-2 focus:ring-brand-600"
                          [checked]="preference(category)"
                          [disabled]="isLocked(category)"
                          (change)="toggle(category, $event)"
                        />
                        <span class="sr-only">
                          {{ t('legal.cookies.toggle', {
                            name: t('legal.cookies.categories.' + category),
                          }) }}
                        </span>
                      </label>
                    </li>
                  }
                </ul>
              }
            </div>

            <div class="flex shrink-0 flex-col gap-2 lg:w-[260px]">
              <div class="flex gap-2">
                <button
                  ij-button
                  type="button"
                  variant="primary"
                  class="flex-1"
                  (click)="acceptAll()"
                  >{{ t('legal.cookies.acceptAll') }}</button
                >
                <button
                  ij-button
                  type="button"
                  variant="soft"
                  class="flex-1"
                  (click)="rejectAll()"
                  >{{ t('legal.cookies.rejectAll') }}</button
                >
              </div>
              <button ij-button type="button" variant="soft" (click)="toggleExpanded()">
                {{ expanded() ? t('legal.cookies.hideDetails') : t('legal.cookies.showDetails') }}
              </button>
            </div>
          </div>
        </div>
      </aside>
    }
  `,
})
export class IjCookieBanner {
  protected readonly consent = inject(ConsentService);
  private readonly facade = inject(LegalConsentFacade);

  protected readonly expanded = signal(false);
  /** Copia editable de las preferencias mientras se afina en el banner. */
  private readonly draft = signal<CookiePreferences | null>(null);

  protected readonly categories = COOKIE_CATEGORIES;
  protected readonly cookies = COOKIES;
  protected readonly policyRoute = legalDocument(LegalDocCode.COOKIES).route;
  protected readonly policyTitleKey = legalDocument(LegalDocCode.COOKIES).titleKey;

  private readonly active = computed<CookiePreferences>(
    () => this.draft() ?? this.consent.current(),
  );

  protected preference(category: CookieCategory): boolean {
    return this.active()[category];
  }

  /** `necessary` no es una elección: se informa, no se rechaza. */
  protected isLocked(category: CookieCategory): boolean {
    return category === 'necessary';
  }

  protected cookiesOf(category: CookieCategory): typeof COOKIES {
    return COOKIES.filter((cookie) => cookie.category === category);
  }

  protected toggle(category: CookieCategory, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const current = this.active();
    this.draft.set({ ...current, [category]: checked });
  }

  protected toggleExpanded(): void {
    this.expanded.update((value) => !value);
  }

  protected acceptAll(): void {
    this.commit({
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
    });
  }

  protected rejectAll(): void {
    this.commit({
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
    });
  }

  /**
   * Decide y cierra.
   *
   * El registro legal se dispara **una vez**, en cuanto hay respuesta, y no en
   * cada repintado: el `catchError` de la fachada devuelve `[]` sin propagar, de
   * modo que un fallo de red no deja el banner pegado en pantalla.
   *
   * Sin sesión, no hay `user_id` con que imputar la elección, así que no se
   * envía nada. No es una omisión: el registro de la respuesta al banner sin
   * cuenta no podría relacionarse con nadie después, y `RecordConsentUseCase`
   * rechaza precisamente esa petición por diseño en lugar de guardarla huérfana.
   */
  private commit(preferences: CookiePreferences): void {
    this.consent.save(preferences);
    this.draft.set(null);
    this.facade.recordCookiePreferences().subscribe();
  }
}

