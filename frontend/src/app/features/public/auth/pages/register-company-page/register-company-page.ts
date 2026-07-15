import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiErrorResponse } from '@/core/models/api-response.models';
import { AuthErrorCode } from '@/core/models/error-code.enum';
import { AuthApi } from '@/features/public/auth/data/auth.api';
import { RegisterStatus } from '@/features/public/auth/models/auth.models';
import { AuthStepper } from '@/features/public/auth/components/auth-stepper/auth-stepper';
import { MX_STATES, SAT_TAX_REGIMES } from '@/shared/catalogs/mx.catalogs';
import {
  PASSWORD_POLICY_HINT,
  passwordPolicyValidator,
} from '@/shared/validators/password.validator';
import { passwordsMatchValidator } from '@/shared/validators/passwords-match.validator';
import {
  postalCodeValidator,
  rfcValidator,
} from '@/shared/validators/mx-identifiers.validator';
import { IjButton, IjIcon } from '@/shared/ui';

const INPUT_BASE =
  'w-full rounded-xl border bg-surface px-4 py-3 text-[15px] text-body ' +
  'outline-none transition placeholder:text-muted focus:ring-2';

const STEP_CONTROLS: string[][] = [
  ['email', 'password', 'confirmPassword'],
  ['legalName', 'businessName', 'rfc', 'taxRegime', 'postalCode'],
  ['state', 'municipality'],
];

/** Registro de empresa (HU-005) en 3 pasos, localizado a México. */
@Component({
  selector: 'app-register-company-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
  imports: [ReactiveFormsModule, RouterLink, AuthStepper, IjButton, IjIcon],
  template: `
    <div class="w-full rounded-[20px] bg-white p-8 shadow-float sm:p-9">
      @if (status() === 'success') {
        <div class="text-center">
          <span
            class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-green-soft text-accent-green"
          >
            <ij-icon name="mail" [size]="26" />
          </span>
          <h1 class="text-[22px] font-bold tracking-tight text-ink-900">¡Empresa registrada!</h1>
          <p class="mt-2 text-[14.5px] leading-relaxed text-muted">
            Enviamos un enlace de verificación a
            <b class="text-ink-900">{{ form.controls.email.value }}</b>. Verifícalo para poder
            iniciar sesión.
          </p>
          <a
            ij-button
            routerLink="/auth/login"
            variant="primary"
            shape="rounded"
            size="lg"
            class="mt-6 w-full shadow-search"
          >
            Ir a iniciar sesión
          </a>
        </div>
      } @else {
        <h1 class="text-[24px] font-bold tracking-tight text-ink-900">Crea tu cuenta de empresa</h1>
        <p class="mt-1.5 mb-6 text-[14.5px] text-muted">Publica vacantes y encuentra talento.</p>

        <app-auth-stepper [steps]="stepLabels" [current]="step()" />

        @if (errorMessage()) {
          <div
            role="alert"
            class="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-[13.5px] font-semibold text-red-700"
          >
            <ij-icon name="alert-triangle" [size]="18" class="mt-0.5 shrink-0" />
            <span>{{ errorMessage() }}</span>
          </div>
        }

        <form novalidate [formGroup]="form" (ngSubmit)="onSubmit()">
          <!-- Paso 1: Cuenta -->
          @if (step() === 0) {
            <div class="space-y-4">
              <div>
                <label [class]="labelClass" for="rc-email">Correo electrónico</label>
                <input id="rc-email" type="email" formControlName="email" autocomplete="email"
                  placeholder="empresa@correo.com" [class]="cls('email')" />
                @if (invalid('email')) {
                  <p [class]="errClass">Ingresa un correo válido.</p>
                }
              </div>
              <div>
                <label [class]="labelClass" for="rc-pass">Contraseña</label>
                <div class="relative">
                  <input id="rc-pass" [type]="showPassword() ? 'text' : 'password'"
                    formControlName="password" autocomplete="new-password" placeholder="••••••••"
                    [class]="cls('password') + ' pr-12'" />
                  <button type="button" [class]="eyeClass"
                    (click)="showPassword.set(!showPassword())"
                    [attr.aria-label]="showPassword() ? 'Ocultar' : 'Mostrar'">
                    <ij-icon [name]="showPassword() ? 'eye-off' : 'eye'" [size]="20" [strokeWidth]="1.9" />
                  </button>
                </div>
                @if (invalid('password')) {
                  <p [class]="errClass">{{ passwordHint }}</p>
                } @else {
                  <p class="mt-1.5 text-xs text-muted">{{ passwordHint }}</p>
                }
              </div>
              <div>
                <label [class]="labelClass" for="rc-pass2">Confirmar contraseña</label>
                <input id="rc-pass2" [type]="showPassword() ? 'text' : 'password'"
                  formControlName="confirmPassword" autocomplete="new-password" placeholder="••••••••"
                  [class]="cls('confirmPassword')" />
                @if (confirmMismatch()) {
                  <p [class]="errClass">Las contraseñas no coinciden.</p>
                }
              </div>
            </div>
          }

          <!-- Paso 2: Datos fiscales -->
          @if (step() === 1) {
            <div class="space-y-4">
              <div>
                <label [class]="labelClass" for="rc-legal">Razón social</label>
                <input id="rc-legal" formControlName="legalName"
                  placeholder="Impulso Talent S.A. de C.V." [class]="cls('legalName')" />
                @if (invalid('legalName')) { <p [class]="errClass">La razón social es obligatoria.</p> }
              </div>
              <div>
                <label [class]="labelClass" for="rc-biz">Nombre comercial</label>
                <input id="rc-biz" formControlName="businessName" placeholder="Impulso Talent"
                  [class]="cls('businessName')" />
                @if (invalid('businessName')) { <p [class]="errClass">El nombre comercial es obligatorio.</p> }
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label [class]="labelClass" for="rc-rfc">RFC</label>
                  <input id="rc-rfc" formControlName="rfc" placeholder="ABC123456T12"
                    class="uppercase" [class]="cls('rfc')" />
                  @if (invalid('rfc')) { <p [class]="errClass">RFC inválido (12–13 caracteres).</p> }
                </div>
                <div>
                  <label [class]="labelClass" for="rc-cp">Código postal</label>
                  <input id="rc-cp" formControlName="postalCode" inputmode="numeric" placeholder="44100"
                    maxlength="5" [class]="cls('postalCode')" />
                  @if (invalid('postalCode')) { <p [class]="errClass">C.P. de 5 dígitos.</p> }
                </div>
              </div>
              <div>
                <label [class]="labelClass" for="rc-regime">Régimen fiscal (SAT)</label>
                <select id="rc-regime" formControlName="taxRegime" [class]="cls('taxRegime')">
                  <option value="" disabled>Selecciona un régimen…</option>
                  @for (r of taxRegimes; track r.code) {
                    <option [value]="r.code">{{ r.name }}</option>
                  }
                </select>
                @if (invalid('taxRegime')) { <p [class]="errClass">Selecciona el régimen fiscal.</p> }
              </div>
            </div>
          }

          <!-- Paso 3: Ubicación y contacto -->
          @if (step() === 2) {
            <div class="space-y-4">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label [class]="labelClass" for="rc-state">Estado</label>
                  <select id="rc-state" formControlName="state" [class]="cls('state')">
                    <option value="" disabled>Selecciona…</option>
                    @for (s of states; track s.code) {
                      <option [value]="s.code">{{ s.name }}</option>
                    }
                  </select>
                  @if (invalid('state')) { <p [class]="errClass">Selecciona el estado.</p> }
                </div>
                <div>
                  <label [class]="labelClass" for="rc-mun">Municipio</label>
                  <input id="rc-mun" formControlName="municipality" placeholder="Guadalajara"
                    [class]="cls('municipality')" />
                  @if (invalid('municipality')) { <p [class]="errClass">El municipio es obligatorio.</p> }
                </div>
              </div>
              <div>
                <label [class]="labelClass" for="rc-sector">Sector económico <span class="font-normal text-muted">(opcional)</span></label>
                <input id="rc-sector" formControlName="economicSector" placeholder="Tecnología"
                  [class]="cls('economicSector')" />
              </div>
              <div>
                <label [class]="labelClass" for="rc-web">Sitio web <span class="font-normal text-muted">(opcional)</span></label>
                <input id="rc-web" formControlName="website" placeholder="https://tuempresa.com"
                  [class]="cls('website')" />
              </div>
            </div>
          }

          <!-- Navegación -->
          <div class="mt-7 flex items-center gap-3">
            @if (step() > 0) {
              <button ij-button type="button" variant="soft" shape="rounded" size="lg"
                class="flex-1" (click)="prev()">Anterior</button>
            }
            @if (step() < 2) {
              <button ij-button type="button" variant="primary" shape="rounded" size="lg"
                class="flex-1 shadow-search" (click)="next()">Continuar</button>
            } @else {
              <button ij-button type="submit" variant="primary" shape="rounded" size="lg"
                class="flex-1 shadow-search disabled:cursor-wait disabled:opacity-80"
                [disabled]="status() === 'loading'">
                @if (status() === 'loading') {
                  <span class="h-[17px] w-[17px] animate-spin rounded-full border-[2.4px] border-white/40 border-t-white"></span>
                }
                {{ status() === 'loading' ? 'Creando…' : 'Crear cuenta' }}
              </button>
            }
          </div>
        </form>

        <p class="mt-6 text-center text-[13.5px] text-muted">
          ¿Eres candidato?
          <a routerLink="/auth/registro" class="font-semibold text-brand hover:text-brand-600">Regístrate como candidato</a>
        </p>
        <p class="mt-1.5 text-center text-[13.5px] text-muted">
          ¿Ya tienes cuenta?
          <a routerLink="/auth/login" class="font-semibold text-brand hover:text-brand-600">Inicia sesión</a>
        </p>
      }
    </div>
  `,
})
export class RegisterCompanyPage {
  private readonly api = inject(AuthApi);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly stepLabels = ['Cuenta', 'Datos fiscales', 'Ubicación'];
  protected readonly states = MX_STATES;
  protected readonly taxRegimes = SAT_TAX_REGIMES;
  protected readonly passwordHint = PASSWORD_POLICY_HINT;
  protected readonly labelClass = 'mb-1.5 block text-sm font-semibold text-ink-900';
  protected readonly errClass = 'mt-1.5 text-xs font-medium text-red-600';
  protected readonly eyeClass =
    'absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-body';

  protected readonly step = signal(0);
  protected readonly status = signal<RegisterStatus>('idle');
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly showPassword = signal(false);

  protected readonly form = this.fb.group(
    {
      email: this.fb.control('', [Validators.required, Validators.email]),
      password: this.fb.control('', [
        Validators.required,
        passwordPolicyValidator,
      ]),
      confirmPassword: this.fb.control('', [Validators.required]),
      legalName: this.fb.control('', [Validators.required, Validators.maxLength(160)]),
      businessName: this.fb.control('', [Validators.required, Validators.maxLength(160)]),
      rfc: this.fb.control('', [Validators.required, rfcValidator]),
      taxRegime: this.fb.control('', [Validators.required]),
      postalCode: this.fb.control('', [Validators.required, postalCodeValidator]),
      state: this.fb.control('', [Validators.required]),
      municipality: this.fb.control('', [Validators.required, Validators.maxLength(120)]),
      economicSector: this.fb.control(''),
      website: this.fb.control(''),
    },
    { validators: passwordsMatchValidator('password', 'confirmPassword') },
  );

  protected invalid(name: string): boolean {
    const c = this.form.get(name) as AbstractControl;
    return c.invalid && (c.dirty || c.touched);
  }

  protected confirmMismatch(): boolean {
    const c = this.form.controls.confirmPassword;
    return (
      (c.invalid || this.form.hasError('passwordsMismatch')) &&
      (c.dirty || c.touched)
    );
  }

  protected cls(name: string): string {
    return this.invalid(name) || (name === 'confirmPassword' && this.confirmMismatch())
      ? `${INPUT_BASE} border-red-300 focus:ring-red-200/70`
      : `${INPUT_BASE} border-line focus:border-brand focus:ring-brand/25`;
  }

  protected next(): void {
    if (!this.stepValid(this.step())) {
      this.touchStep(this.step());
      return;
    }
    this.errorMessage.set(null);
    this.step.update((s) => Math.min(s + 1, 2));
  }

  protected prev(): void {
    this.errorMessage.set(null);
    this.step.update((s) => Math.max(s - 1, 0));
  }

  private stepValid(index: number): boolean {
    const controlsValid = STEP_CONTROLS[index].every(
      (name) => this.form.get(name)!.valid,
    );
    if (index === 0) return controlsValid && !this.form.hasError('passwordsMismatch');
    return controlsValid;
  }

  private touchStep(index: number): void {
    STEP_CONTROLS[index].forEach((name) =>
      this.form.get(name)!.markAsTouched(),
    );
  }

  protected onSubmit(): void {
    if (this.status() === 'loading') return;
    if (this.form.invalid) {
      const firstInvalid = STEP_CONTROLS.findIndex((_, i) => !this.stepValid(i));
      if (firstInvalid >= 0) {
        this.step.set(firstInvalid);
        this.touchStep(firstInvalid);
      }
      return;
    }

    const v = this.form.getRawValue();
    this.status.set('loading');
    this.errorMessage.set(null);

    this.api
      .register({
        accountType: 'company',
        email: v.email,
        password: v.password,
        company: {
          businessName: v.businessName,
          legalName: v.legalName,
          rfc: v.rfc.trim().toUpperCase(),
          taxRegime: v.taxRegime,
          postalCode: v.postalCode,
          economicSector: v.economicSector || undefined,
          website: v.website || undefined,
          country: 'MX',
          state: v.state,
          municipality: v.municipality,
        },
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.status.set('success'),
        error: (error: unknown) => this.handleError(error),
      });
  }

  private handleError(error: unknown): void {
    this.status.set('idle');
    const code = this.errorCodeOf(error);
    switch (code) {
      case AuthErrorCode.EMAIL_ALREADY_EXISTS:
        this.step.set(0);
        this.form.controls.email.setErrors({ taken: true });
        this.errorMessage.set('Ya existe una cuenta con este correo.');
        break;
      case AuthErrorCode.COMPANY_RFC_ALREADY_EXISTS:
        this.step.set(1);
        this.form.controls.rfc.setErrors({ taken: true });
        this.errorMessage.set('Ya existe una empresa registrada con este RFC.');
        break;
      default:
        this.errorMessage.set('No pudimos crear la cuenta. Revisa los datos e inténtalo de nuevo.');
    }
  }

  private errorCodeOf(error: unknown): string | undefined {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as ApiErrorResponse | null;
      return body?.errorCode;
    }
    return undefined;
  }
}
