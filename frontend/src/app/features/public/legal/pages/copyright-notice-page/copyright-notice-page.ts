import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoDirective } from '@jsverse/transloco';
import { AppTranslateService } from '@/core/i18n/app-translate.service';
import {
  LEGAL_IDENTITY,
  PENDING_TOKEN,
  isIdentityComplete,
} from '@/shared/catalogs/legal.catalogs';
import { IjButton, IjInput, IjTextarea } from '@/shared/ui';

/**
 * Aviso y contraaviso de contenido protegido.
 *
 * ## Por qué existe
 *
 * Los artículos 114 Septies y 114 Octies de la Ley Federal del Derecho de Autor
 * obligan a los proveedores de servicios en línea a mantener un mecanismo de
 * aviso para titulares y a poner a su disposición un formulario de
 * contraaviso. El Reglamento del 24-09-2026 desarrolla ese procedimiento en los
 * artículos 37 Bis a 37 Nonies. Sin esta página, Impulso Jobs incumple una
 * obligación que la ley da por presupuesta para cualquier plataforma que
 * publica imágenes.
 *
 * ## Tres reglas del artículo 114 Septies que la forma respeta
 *
 * 1. **El retiro no se condiciona a acreditar el registro.** Se acepta una
 *    declaración bajo protesta de decir verdad, y por eso `proofUrl` es
 *    opcional: pedir el certificado del Registro Público es precisamente lo que
 *    la ley prohíbe usar como filtro.
 * 2. **Quien retira tiene que poder contraavisar**, y por eso la misma forma
 *    sirve para los dos sentidos según se marque el tipo de aviso.
 * 3. **El aviso de mala fe se sanciona** (art. 232 Quinquies), así que se pide
 *    asumirlo de forma expresa antes de enviar.
 *
 * ## Por qué arma un `mailto:` y no tiene endpoint
 *
 * El envío real necesita un buzón y un gestor de casos detrás. Lo que sí se
 * puede hacer sin inventar infraestructura es dejar la forma lista para enviar:
 * compone el correo con los datos ya rellenos y lo abre en el cliente de correo
 * del titular. Es el mecanismo de aviso que la ley pide y funciona desde el
 * primer día. Cuando exista el endpoint, se cambia `buildMailto()` por un
 * `POST` y el resto de la página no cambia.
 */
@Component({
  selector: 'app-copyright-notice-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    TranslocoDirective,
    IjButton,
    IjInput,
    IjTextarea,
  ],
  template: `
    <main class="bg-surface pb-20" *transloco="let t">
      <div class="mx-auto max-w-3xl px-6 pt-12 lg:px-0">
        <p class="text-sm font-medium text-brand-700">{{ t('legal.breadcrumb') }}</p>
        <h1 class="mt-2 text-3xl font-semibold text-ink">
          {{ t('legal.copyrightPage.title') }}
        </h1>
        <p class="mt-3 text-base leading-relaxed text-body">
          {{ t('legal.copyrightPage.intro') }}
        </p>

        @if (!identityComplete) {
          <div
            class="mt-6 rounded-lg border border-accent-pink-strong/30 bg-accent-pink-soft px-4 py-3 text-sm text-accent-pink-strong"
            role="alert"
          >
            {{ t('legal.identityIncomplete') }}
          </div>
        }

        <div class="mt-8 rounded-lg border border-line bg-white p-5">
          <h2 class="text-base font-semibold text-ink">
            {{ t('legal.copyrightPage.legalTitle') }}
          </h2>
          <ul class="mt-3 flex flex-col gap-2">
            @for (rule of legalBasis; track rule) {
              <li class="flex gap-2.5 text-sm leading-relaxed text-body">
                <span class="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand"></span>
                <span>{{ rule }}</span>
              </li>
            }
          </ul>
        </div>

        <form class="mt-8" [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
          <div class="flex flex-col gap-5">
            <fieldset class="rounded-lg border border-line bg-white p-5">
              <legend class="px-2 text-sm font-semibold text-ink">
                {{ t('legal.copyrightPage.typeLabel') }}
              </legend>
              <div class="mt-2 flex flex-col gap-2">
                @for (option of typeOptions; track option.value) {
                  <label class="flex cursor-pointer items-start gap-3 text-sm text-body">
                    <input
                      type="radio"
                      class="mt-0.5 h-4 w-4 border-line text-brand focus:ring-2 focus:ring-brand-600"
                      formControlName="type"
                      [value]="option.value"
                    />
                    <span>
                      {{ t(option.labelKey) }}
                      <span class="block text-xs text-muted">
                        {{ t(option.hintKey) }}
                      </span>
                    </span>
                  </label>
                }
              </div>
            </fieldset>

            <ij-input
              [label]="t('legal.copyrightPage.nameLabel')"
              formControlName="name"
              [required]="true"
              [error]="invalid('name') ? t('legal.copyrightPage.required') : null"
            />
            <ij-input
              [label]="t('legal.copyrightPage.emailLabel')"
              type="email"
              formControlName="email"
              [required]="true"
              [error]="invalid('email') ? t('validation.email') : null"
            />
            <ij-input
              [label]="t('legal.copyrightPage.urlLabel')"
              [placeholder]="t('legal.copyrightPage.urlPlaceholder')"
              formControlName="url"
              [required]="true"
              [error]="invalid('url') ? t('legal.copyrightPage.required') : null"
            />
            <ij-input
              [label]="t('legal.copyrightPage.workLabel')"
              formControlName="work"
              [required]="true"
              [error]="invalid('work') ? t('legal.copyrightPage.required') : null"
            />
            <ij-textarea
              [label]="t('legal.copyrightPage.reasonLabel')"
              formControlName="reason"
              [rows]="4"
              [required]="true"
              [error]="invalid('reason') ? t('legal.copyrightPage.required') : null"
            />
            <ij-input
              [label]="t('legal.copyrightPage.proofLabel')"
              formControlName="proofUrl"
              [error]="invalid('proofUrl') ? t('legal.copyrightPage.urlError') : null"
            />
            <p class="text-xs leading-relaxed text-muted">
              {{ t('legal.copyrightPage.proofHint') }}
            </p>

            <label class="flex cursor-pointer items-start gap-3 text-sm text-body">
              <input
                type="checkbox"
                class="mt-0.5 h-4 w-4 rounded border-line text-brand focus:ring-2 focus:ring-brand-600"
                formControlName="sworn"
              />
              <span>{{ t('legal.copyrightPage.swornLabel') }}</span>
            </label>
          </div>

          @if (errorMessage()) {
            <p class="mt-4 text-sm font-medium text-accent-pink-strong" role="alert">
              {{ errorMessage() }}
            </p>
          }

          <div class="mt-7 flex flex-wrap items-center gap-3">
            <button ij-button type="submit" variant="primary" size="lg">
              {{ t('legal.copyrightPage.submit') }}
            </button>
            <a
              [href]="'mailto:' + contactEmail"
              class="text-sm font-medium text-ink underline decoration-line underline-offset-2"
              >{{ t('legal.copyrightPage.mailFallback') }}</a
            >
          </div>
        </form>
      </div>
    </main>
  `,
})
export class CopyrightNoticePage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly i18n = inject(AppTranslateService);

  protected readonly identityComplete = isIdentityComplete();
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly contactEmail =
    LEGAL_IDENTITY.consumerEmail === PENDING_TOKEN
      ? 'contacto@ejemplo.invalid'
      : LEGAL_IDENTITY.consumerEmail;

  protected readonly legalBasis: readonly string[] = [
    this.i18n.t('legal.copyrightPage.rule1'),
    this.i18n.t('legal.copyrightPage.rule2'),
    this.i18n.t('legal.copyrightPage.rule3'),
  ];

  protected readonly typeOptions = [
    {
      value: 'TAKEDOWN',
      labelKey: 'legal.copyrightPage.types.takedown',
      hintKey: 'legal.copyrightPage.types.takedownHint',
    },
    {
      value: 'COUNTER',
      labelKey: 'legal.copyrightPage.types.counter',
      hintKey: 'legal.copyrightPage.types.counterHint',
    },
  ] as const;

  protected readonly form = this.fb.group({
    type: this.fb.control<'TAKEDOWN' | 'COUNTER'>('TAKEDOWN'),
    name: this.fb.control('', [Validators.required, Validators.maxLength(120)]),
    email: this.fb.control('', [Validators.required, Validators.email]),
    url: this.fb.control('', [
      Validators.required,
      Validators.pattern(/^https?:\/\/\S+$/),
      Validators.maxLength(500),
    ]),
    work: this.fb.control('', [Validators.required, Validators.maxLength(200)]),
    reason: this.fb.control('', [Validators.required, Validators.maxLength(2000)]),
    // Opcional a propósito: el art. 114 Septies prohíbe condicionar el retiro a
    // acreditar el registro de la obra.
    proofUrl: this.fb.control('', [Validators.pattern(/^https?:\/\/\S+$/)]),
    sworn: this.fb.control(false),
  });

  protected invalid(name: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.dirty || control.touched);
  }

  protected onSubmit(): void {
    this.errorMessage.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set(this.i18n.t('legal.copyrightPage.missingFields'));
      return;
    }
    if (!this.form.controls.sworn.value) {
      this.errorMessage.set(this.i18n.t('legal.copyrightPage.swornRequired'));
      return;
    }

    window.location.href = this.buildMailto(this.form.getRawValue());
  }

  /**
   * Compone el correo con los campos ya rellenos.
   *
   * Se usa `encodeURIComponent` en cada valor, no uno solo sobre el cuerpo
   * entero: si un campo trae un `&` o un salto de línea, un `encodeURIComponent`
   * global lo escaparía dentro de un parámetro ya construido y el mensaje
   * llegaría corrupto.
   */
  private buildMailto(value: {
    type: string;
    name: string;
    email: string;
    url: string;
    work: string;
    reason: string;
    proofUrl: string;
    sworn: boolean;
  }): string {
    const label = (key: string): string =>
      encodeURIComponent(this.i18n.t(key));

    const subject = this.i18n.t(
      value.type === 'COUNTER'
        ? 'legal.copyrightPage.counterSubject'
        : 'legal.copyrightPage.takedownSubject',
    );

    const body = [
      `${label('legal.copyrightPage.typeLabel')}: ${label(`legal.copyrightPage.types.${value.type === 'COUNTER' ? 'counter' : 'takedown'}`)}`,
      `${label('legal.copyrightPage.nameLabel')}: ${value.name}`,
      `${label('legal.copyrightPage.emailLabel')}: ${value.email}`,
      `${label('legal.copyrightPage.urlLabel')}: ${value.url}`,
      `${label('legal.copyrightPage.workLabel')}: ${value.work}`,
      value.proofUrl ? `${label('legal.copyrightPage.proofLabel')}: ${value.proofUrl}` : '',
      '',
      `${label('legal.copyrightPage.reasonLabel')}:`,
      value.reason,
    ]
      .filter(Boolean)
      .join('\n');

    return `mailto:${this.contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
}