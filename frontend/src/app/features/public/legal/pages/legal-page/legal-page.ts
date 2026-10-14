import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { IjIcon } from '@/shared/ui';
import { ConsentService } from '@/core/consent/consent.service';
import { LanguageService } from '@/core/i18n/language.service';
import {
  LEGAL_IDENTITY,
  LegalDocCode,
  isIdentityComplete,
  legalDocument,
} from '@/shared/catalogs/legal.catalogs';
import {
  CONTENT_BY_DOC_CODE,
  type LegalDocumentContent,
  legalContent,
} from '@/features/public/legal/content/legal-content';

/**
 * Página de documento legal: una por ruta, todas con la misma plantilla.
 *
 * ## Por qué el texto va interpolado y no en Transloco
 *
 * Un aviso son miles de palabras. Meterlo en `es.json`/`en.json` dejaría un
 * diccionario de varios miles de líneas sin tipado, donde una referencia mal
 * escrita sólo se descubre leyendo la página publicada. Con el modelo tipado de
 * `content/`, TypeScript revisa la forma (secciones, anclas, tablas) y el
 * `translations.spec.ts` sigue cubriendo lo que sí va por clave — los botones y
 * las etiquetas de las casillas.
 *
 * ## El aviso de datos incompletos
 *
 * Si `isIdentityComplete()` es `false`, se muestra un aviso en rojo en vez de
 * imprimir `[PENDIENTE]` en la tabla. La razón no es cosmética: el artículo 15, ' +
 * fracción I de la LFPDPPP obliga a identificar al responsable, y una tabla con
 * marcadores entre llaves es un aviso que no cumple. Que se note en desarrollo y
 * en producción es justo el objetivo.
 */
@Component({
  selector: 'app-legal-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective, IjIcon],
  template: `
    <main class="bg-surface pb-20" *transloco="let t">
      <div class="mx-auto max-w-3xl px-6 pt-12 lg:px-0">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-sm font-medium text-brand-700">
              {{ t('legal.breadcrumb') }}
            </p>
            <h1 class="mt-2 text-3xl font-semibold text-ink">
              {{ t(doc().titleKey) }}
            </h1>
            <p class="mt-2 text-sm text-muted">
              {{
                t('legal.versionLine', {
                  version: doc().version,
                  date: doc().effectiveDate,
                })
              }}
            </p>
          </div>

          <!--
            Copia descargable. La página es la versión canónica: versionada, con
            índice, traducida y enlazada desde el registro de consentimiento.
            El PDF es sólo para quien lo quiera en papel.

            Se abre en pestaña nueva con rel="noopener" porque, sin ese atributo,
            la ventana de origen queda accesible desde la nueva.
          -->
          @if (doc().pdf; as pdf) {
            <a
              [href]="pdf"
              target="_blank"
              rel="noopener"
              class="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3.5 py-2 text-sm font-medium text-body transition-colors hover:border-brand hover:text-brand-strong"
            >
              <ij-icon name="file" [size]="16" />
              {{ t('legal.downloadPdf') }}
            </a>
          }
        </div>

        @if (!identityComplete) {
          <div
            class="mt-6 rounded-lg border border-accent-pink-strong/30 bg-accent-pink-soft px-4 py-3 text-sm text-accent-pink-strong"
            role="alert"
          >
            {{ t('legal.identityIncomplete') }}
          </div>
        }

        <p class="mt-6 text-base leading-relaxed text-body">
          {{ content().intro }}
        </p>

        <!-- En resumen -->
        <section class="mt-8 rounded-lg border border-line bg-white p-5">
          <h2 class="text-base font-semibold text-ink">
            {{ t('legal.summary') }}
          </h2>
          <ul class="mt-3 flex flex-col gap-2">
            @for (item of content().summary; track item) {
              <li class="flex gap-2.5 text-sm leading-relaxed text-body">
                <span class="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand"></span>
                <span>{{ item }}</span>
              </li>
            }
          </ul>
        </section>

        <!-- Índice -->
        <nav class="mt-8" [attr.aria-label]="t('legal.index')">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-muted">
            {{ t('legal.index') }}
          </h2>
          <ol class="mt-3 grid gap-1.5 sm:grid-cols-2">
            @for (section of content().sections; track section.id) {
              <li class="text-sm">
                <a
                  [href]="'#' + section.id"
                  class="text-ink underline decoration-line underline-offset-2 hover:decoration-ink"
                  >{{ section.heading }}</a
                >
              </li>
            }
          </ol>
        </nav>

        <!-- Secciones -->
        @for (section of content().sections; track section.id) {
          <section [id]="section.id" class="mt-10 scroll-mt-24">
            <h2 class="text-xl font-semibold text-ink">{{ section.heading }}</h2>

            @for (paragraph of section.paragraphs ?? []; track $index) {
              <p class="mt-3 text-[15px] leading-relaxed text-body">{{ paragraph }}</p>
            }

            @if (section.bullets?.length) {
              <ul class="mt-3 flex flex-col gap-2">
                @for (item of section.bullets!; track item) {
                  <li class="flex gap-2.5 text-[15px] leading-relaxed text-body">
                    <span class="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand"></span>
                    <span>{{ item }}</span>
                  </li>
                }
              </ul>
            }

            @if (section.steps?.length) {
              <ol class="mt-3 flex flex-col gap-2.5">
                @for (item of section.steps!; track item; let i = $index) {
                  <li class="flex gap-3 text-[15px] leading-relaxed text-body">
                    <span
                      class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700"
                      >{{ i + 1 }}</span
                    >
                    <span>{{ item }}</span>
                  </li>
                }
              </ol>
            }

            @if (section.table; as table) {
              <div class="mt-4 overflow-x-auto rounded-lg border border-line">
                <table class="w-full border-collapse text-sm">
                  <thead class="bg-surface">
                    <tr>
                      @for (cell of table.head; track cell) {
                        <th
                          scope="col"
                          class="border-b border-line px-4 py-2.5 text-left font-semibold text-ink"
                        >
                          {{ cell }}
                        </th>
                      }
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of table.rows; track row[0]) {
                      <tr class="border-b border-line last:border-0">
                        @for (cell of row; track cell) {
                          <td class="px-4 py-2.5 align-top text-body">{{ cell }}</td>
                        }
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }

            @if (section.callout; as callout) {
              <p
                class="mt-4 rounded-lg border-l-4 border-brand bg-brand-50/60 px-4 py-3 text-sm leading-relaxed text-body"
              >
                {{ callout }}
              </p>
            }
          </section>
        }

        <p class="mt-12 border-t border-line pt-6 text-[15px] leading-relaxed text-muted">
          {{ content().closing }}
        </p>

        <!-- Reabrir el banner: el art. 14 párrafo III exige poder deshacer. -->
        @if (doc().code === LegalDocCode.COOKIES) {
          <div class="mt-8 rounded-lg border border-line bg-white p-5">
            <h2 class="text-base font-semibold text-ink">
              {{ t('legal.cookies.manageTitle') }}
            </h2>
            <p class="mt-2 text-sm leading-relaxed text-body">
              {{ t('legal.cookies.manageBody') }}
            </p>
            <button
              type="button"
              ij-button
              variant="soft"
              class="mt-4"
              (click)="reopenBanner()"
            >
              {{ t('legal.cookies.reopen') }}
            </button>
          </div>
        }
      </div>
    </main>
  `,
})
export class LegalPage {
  private readonly route = inject(ActivatedRoute);
  private readonly language = inject(LanguageService);
  private readonly consent = inject(ConsentService);

  protected readonly LegalDocCode = LegalDocCode;
  protected readonly identityComplete = isIdentityComplete();

  protected readonly doc = computed(() => {
    const code = this.route.snapshot.data['code'] as LegalDocCode;
    return legalDocument(code);
  });

  protected readonly content = computed<LegalDocumentContent>(() => {
    const doc = this.doc();
    const key = CONTENT_BY_DOC_CODE[doc.code];
    return legalContent(key, this.language.current());
  });

  /**
   * Vuelve a mostrar el banner de cookies.
   *
   * El artículo 14, párrafo tercero, del Reglamento de la LFPDPPP no sólo pide
   * informar de las tecnologías de recabado automático: pide informar de **la
   * forma en que se podrán deshabilitar**. Sin este botón, quien ya respondió no
   * tiene manera de volver atrás, y el aviso quedaría reducido a un texto que
   * no cumple.
   */
  protected reopenBanner(): void {
    this.consent.reopen();
  }
}