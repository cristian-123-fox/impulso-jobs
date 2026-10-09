import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  signal,
  afterNextRender,
  viewChild,
} from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { environment } from '@env';
import { GoogleIdentityService } from '@/core/auth/google-identity.service';
import { AppTranslateService } from '@/core/i18n/app-translate.service';
import { LanguageService } from '@/core/i18n/language.service';
import {
  AccountType,
  LoginCredentials,
  LoginStatus,
  ResendStatus,
} from '@/features/public/auth/models/auth.models';
import { IjButton, IjIcon, IjInput } from '@/shared/ui';

/**
 * Tarjeta del formulario de acceso (presentacional). Incluye el selector
 * Candidato/Empresa, valida con un formulario reactivo tipado y emite las
 * credenciales; el estado del envío llega por inputs desde la fachada.
 *
 * El botón de Google lo pinta GIS (estilo oficial de Google) dentro de un
 * contenedor propio; sólo hay que escuchar `googleCredential` y mandarlo al
 * backend. Ver `GoogleIdentityService`.
 */
@Component({
  selector: 'app-login-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
  imports: [
    ReactiveFormsModule,
    RouterLink,
    IjButton,
    IjIcon,
    IjInput,
    TranslocoDirective,
  ],
  template: `
    <form
      *transloco="let t"
      novalidate
      [formGroup]="form"
      [class.animate-shake]="isError()"
      class="w-full rounded-[20px] bg-white p-8 shadow-float sm:p-9"
      (ngSubmit)="onSubmit()"
    >
      <h1 class="text-[25px] font-bold tracking-tight text-ink-900">
        {{ t('auth.login.title') }}
      </h1>
      <p class="mt-2 text-[15px] text-muted">
        {{
          accountType() === 'company'
            ? t('auth.login.subtitleCompany')
            : t('auth.login.subtitleCandidate')
        }}
      </p>

      <!-- Selector de tipo de cuenta -->
      <div class="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-surface p-1" role="tablist">
        <button
          type="button"
          role="tab"
          [attr.aria-selected]="accountType() === 'candidate'"
          [class]="segClass('candidate')"
          (click)="accountType.set('candidate')"
        >
          {{ t('auth.login.candidate') }}
        </button>
        <button
          type="button"
          role="tab"
          [attr.aria-selected]="accountType() === 'company'"
          [class]="segClass('company')"
          (click)="accountType.set('company')"
        >
          {{ t('auth.login.company') }}
        </button>
      </div>

      <!-- Banner de error / verificación -->
      @if (isError()) {
        <div
          role="alert"
          class="mt-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-red-700"
        >
          <ij-icon name="alert-triangle" [size]="18" class="mt-0.5 shrink-0" />
          <div class="flex-1 text-[13.5px]">
            <p class="font-semibold">
              {{ errorMessage() ?? t('auth.login.genericError') }}
            </p>
            @if (showResend()) {
              <div class="mt-2">
                @if (resendStatus() === 'sent') {
                  <span class="font-semibold text-accent-green">
                    {{ t('auth.login.resendSent') }}
                  </span>
                } @else {
                  <button
                    type="button"
                    class="font-bold text-brand-strong underline transition-opacity hover:text-brand-600 disabled:opacity-60"
                    [disabled]="resendStatus() === 'sending'"
                    (click)="resendRequested.emit()"
                  >
                    {{
                      resendStatus() === 'sending'
                        ? t('auth.login.resending')
                        : t('auth.login.resend')
                    }}
                  </button>
                  @if (resendStatus() === 'error') {
                    <span class="ml-2 text-red-600">
                      {{ t('auth.login.resendError') }}
                    </span>
                  }
                }
              </div>
            }
          </div>
        </div>
      }

      @if (isSuccess()) {
        <div
          role="status"
          class="mt-5 flex items-center gap-2.5 rounded-xl border border-accent-green/25 bg-accent-green-soft px-3.5 py-3 text-[13.5px] font-semibold text-accent-green"
        >
          <ij-icon name="check" [size]="18" [strokeWidth]="2.6" />
          <span>{{ t('auth.login.success') }}</span>
        </div>
      }

      <!-- Correo -->
      <div class="mt-6">
        <ij-input
          [label]="t('auth.common.email')"
          type="email"
          autocomplete="email"
          [placeholder]="t('auth.common.emailPlaceholder')"
          formControlName="email"
        />
      </div>

      <!-- Contraseña -->
      <div class="mt-5">
        <ij-input
          [label]="t('auth.common.password')"
          [type]="showPassword() ? 'text' : 'password'"
          autocomplete="current-password"
          placeholder="••••••••"
          formControlName="password"
        >
          <button
            ijSuffix
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-body"
            [attr.aria-label]="
              showPassword()
                ? t('auth.common.hidePassword')
                : t('auth.common.showPassword')
            "
            [attr.aria-pressed]="showPassword()"
            (click)="togglePassword()"
          >
            <ij-icon [name]="showPassword() ? 'eye-off' : 'eye'" [size]="20" [strokeWidth]="1.9" />
          </button>
        </ij-input>
      </div>

      <!-- Recordar / recuperar -->
      <div class="mt-4 flex items-center justify-between gap-3">
        <label class="flex cursor-pointer select-none items-center gap-2.5 text-[13.5px] text-body">
          <input
            type="checkbox"
            formControlName="remember"
            class="h-[17px] w-[17px] cursor-pointer rounded accent-brand"
          />
          {{ t('auth.login.remember') }}
        </label>
        <a
          routerLink="/auth/recuperar-password"
          class="text-[13.5px] font-semibold text-brand-strong transition-colors hover:text-brand-600"
        >
          {{ t('auth.login.forgot') }}
        </a>
      </div>

      <!-- Enviar -->
      <button
        ij-button
        type="submit"
        variant="primary"
        shape="rounded"
        size="lg"
        class="mt-6 w-full shadow-search disabled:cursor-wait disabled:opacity-80"
        [disabled]="isLoading()"
      >
        @if (isLoading()) {
          <span
            class="h-[17px] w-[17px] animate-spin rounded-full border-[2.4px] border-white/40 border-t-white"
            aria-hidden="true"
          ></span>
        }
        {{ submitLabel() }}
      </button>

      <!-- Acceso con Google (GIS pinta el botón dentro del contenedor) -->
      @if (googleEnabled() && !googleFailed()) {
        <!-- Se oculta en la pestaña Empresa: el backend crea cuentas de
             candidato, así que ofrecerlo ahí prometería algo que no hace. -->
        <div class="mt-7" [class.hidden]="accountType() === 'company'">
          <div class="flex items-center gap-3.5">
            <span class="whitespace-nowrap text-[13.5px] font-semibold text-body">
              {{ t('auth.login.socialDivider') }}
            </span>
            <span class="h-px flex-1 bg-line"></span>
          </div>
          <div class="mt-4 flex justify-center">
            <div #googleButton class="min-h-[40px]"></div>
          </div>
        </div>
      }

      <p class="mt-6 text-center text-[13.5px] text-muted">
        {{ t('auth.login.noAccount') }}
        <a [routerLink]="registerLink()" class="font-semibold text-brand-strong transition-colors hover:text-brand-600">
          {{ t('auth.login.createAccount') }}
        </a>
      </p>
    </form>
  `,
})
export class LoginForm {
  readonly status = input<LoginStatus>('idle');
  readonly errorMessage = input<string | null>(null);
  readonly showResend = input(false);
  readonly resendStatus = input<ResendStatus>('idle');
  /**
   * Ofrecer el login con Google. Sólo lo activa la página cuando hay
   * `googleClientId` en el environment: sin Client ID el botón no puede
   * funcionar, y un botón muerto en la pantalla más crítica del embudo es
   * peor que no tener botón.
   */
  readonly googleEnabled = input(false);
  readonly submitted = output<LoginCredentials>();
  /** ID token que GIS entrega al usuario elegir su cuenta. */
  readonly googleCredential = output<string>();
  readonly resendRequested = output<void>();

  private readonly fb = inject(NonNullableFormBuilder);
  private readonly i18n = inject(AppTranslateService);
  private readonly language = inject(LanguageService);
  private readonly google = inject(GoogleIdentityService);
  private readonly googleHost = viewChild<ElementRef<HTMLElement>>(
    'googleButton',
  );

  protected readonly form = this.fb.group({
    email: this.fb.control('', [Validators.required, Validators.email]),
    password: this.fb.control('', [Validators.required, Validators.minLength(6)]),
    remember: this.fb.control(true),
  });
  protected readonly controls = this.form.controls;

  protected readonly accountType = signal<AccountType>('candidate');
  protected readonly showPassword = signal(false);
  /** Si GIS no carga (red, bloqueador) el bloque entero desaparece. */
  protected readonly googleFailed = signal(false);

  constructor() {
    // `afterNextRender`: GIS toca `document`, y `/auth/**` se prerenderiza.
    afterNextRender(() => {
      if (!this.googleEnabled()) return;
      const host = this.googleHost();
      if (!host) return;
      this.google
        .load()
        .then(() =>
          this.google.renderButton(host.nativeElement, {
            clientId: environment.googleClientId,
            lang: this.language.current(),
            onCredential: (credential) => this.googleCredential.emit(credential),
          }),
        )
        .catch(() => this.googleFailed.set(true));
    });
  }

  protected readonly isLoading = computed(() => this.status() === 'loading');
  protected readonly isSuccess = computed(() => this.status() === 'success');
  protected readonly isError = computed(() => this.status() === 'error');

  protected readonly submitLabel = computed(() =>
    this.i18n.t(
      this.isLoading()
        ? 'auth.login.submitting'
        : this.isSuccess()
          ? 'auth.login.submitted'
          : 'auth.login.submit',
    ),
  );

  protected readonly registerLink = computed(() =>
    this.accountType() === 'company' ? '/auth/registro/empresa' : '/auth/registro',
  );

  protected segClass(type: AccountType): string {
    const base = 'rounded-lg py-2.5 text-sm font-semibold transition-colors';
    return this.accountType() === type
      ? `${base} bg-white text-brand-strong shadow-sm`
      : `${base} text-muted hover:text-body`;
  }

  protected togglePassword(): void {
    this.showPassword.update((visible) => !visible);
  }

  protected onSubmit(): void {
    if (this.isLoading()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.submitted.emit({ ...value, accountType: this.accountType() });
  }
}
