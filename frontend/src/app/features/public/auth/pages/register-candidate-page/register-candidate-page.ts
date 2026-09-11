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
import { TranslocoDirective } from '@jsverse/transloco';
import { AppTranslateService } from '@/core/i18n/app-translate.service';
import { ApiErrorResponse } from '@/core/models/api-response.models';
import { AuthErrorCode } from '@/core/models/error-code.enum';
import { AuthApi } from '@/features/public/auth/data/auth.api';
import { RegisterStatus } from '@/features/public/auth/models/auth.models';
import { AuthStepper } from '@/features/public/auth/components/auth-stepper/auth-stepper';
import { DOCUMENT_TYPES, MX_STATES } from '@/shared/catalogs/mx.catalogs';
import { passwordPolicyValidator } from '@/shared/validators/password.validator';
import { passwordsMatchValidator } from '@/shared/validators/passwords-match.validator';
import {
  curpValidator,
  notFutureDateValidator,
} from '@/shared/validators/mx-identifiers.validator';
import {
  IjButton,
  IjDatepicker,
  IjIcon,
  IjInput,
  IjOption,
  IjSelect,
} from '@/shared/ui';

const STEP_CONTROLS: string[][] = [
  ['email', 'password', 'confirmPassword'],
  ['firstName', 'lastName', 'documentType', 'documentNumber', 'curp', 'birthDate'],
  ['state', 'municipality'],
];

/** Registro de candidato (HU-006) en 3 pasos, localizado a México. */
@Component({
  selector: 'app-register-candidate-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
  imports: [
    ReactiveFormsModule,
    RouterLink,
    AuthStepper,
    IjButton,
    IjIcon,
    IjInput,
    IjSelect,
    IjDatepicker,
    TranslocoDirective,
  ],
  template: `
    <div *transloco="let t" class="w-full rounded-[20px] bg-white p-8 shadow-float sm:p-9">
      @if (status() === 'success') {
        <div class="text-center">
          <span
            class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-green-soft text-accent-green"
          >
            <ij-icon name="mail" [size]="26" />
          </span>
          <h1 class="text-[22px] font-bold tracking-tight text-ink-900">
            {{ t('auth.register.candidate.successTitle') }}
          </h1>
          <p class="mt-2 text-[14.5px] leading-relaxed text-muted">
            {{
              t('auth.register.candidate.successBody', {
                email: form.controls.email.value,
              })
            }}
          </p>
          <a
            ij-button
            routerLink="/auth/login"
            variant="primary"
            shape="rounded"
            size="lg"
            class="mt-6 w-full shadow-search"
          >
            {{ t('auth.register.goLogin') }}
          </a>
        </div>
      } @else {
        <h1 class="text-[24px] font-bold tracking-tight text-ink-900">
          {{ t('auth.register.candidate.title') }}
        </h1>
        <p class="mt-1.5 mb-6 text-[14.5px] text-muted">
          {{ t('auth.register.candidate.lead') }}
        </p>

        <app-auth-stepper [steps]="stepLabels()" [current]="step()" />

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
              <ij-input
                [label]="t('auth.common.email')"
                type="email"
                autocomplete="email"
                [placeholder]="t('auth.common.emailPlaceholder')"
                [error]="invalid('email') ? t('auth.common.emailError') : null"
                formControlName="email"
              />
              <ij-input
                [label]="t('auth.common.password')"
                [type]="showPassword() ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="••••••••"
                [hint]="passwordHint()"
                [error]="invalid('password') ? passwordHint() : null"
                formControlName="password"
              >
                <button
                  ijSuffix
                  type="button"
                  class="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-body"
                  (click)="showPassword.set(!showPassword())"
                  [attr.aria-label]="
                    showPassword() ? t('auth.common.hide') : t('auth.common.show')
                  "
                >
                  <ij-icon [name]="showPassword() ? 'eye-off' : 'eye'" [size]="20" [strokeWidth]="1.9" />
                </button>
              </ij-input>
              <ij-input
                [label]="t('auth.common.confirmPassword')"
                [type]="showPassword() ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="••••••••"
                [error]="confirmMismatch() ? t('auth.common.passwordMismatch') : null"
                formControlName="confirmPassword"
              />
            </div>
          }

          <!-- Paso 2: Datos personales -->
          @if (step() === 1) {
            <div class="space-y-4">
              <div class="grid grid-cols-2 gap-3">
                <ij-input [label]="t('auth.register.candidate.firstName')" [placeholder]="t('auth.register.candidate.firstNamePlaceholder')" [required]="true"
                  [error]="invalid('firstName') ? t('auth.register.candidate.firstNameError') : null" formControlName="firstName" />
                <ij-input [label]="t('auth.register.candidate.lastName')" [placeholder]="t('auth.register.candidate.lastNamePlaceholder')" [required]="true"
                  [error]="invalid('lastName') ? t('auth.register.candidate.lastNameError') : null" formControlName="lastName" />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <ij-select [label]="t('auth.register.candidate.documentType')" [required]="true" [options]="documentTypeOptions"
                  [error]="invalid('documentType') ? t('auth.register.candidate.documentTypeError') : null" formControlName="documentType" />
                <ij-input [label]="t('auth.register.candidate.documentNumber')" [placeholder]="t('auth.register.candidate.documentNumberPlaceholder')" [required]="true"
                  [error]="invalid('documentNumber') ? t('auth.register.candidate.documentNumberError') : null" formControlName="documentNumber" />
              </div>
              <ij-input [label]="t('auth.register.candidate.curp')" [placeholder]="t('auth.register.candidate.curpPlaceholder')" [maxLength]="18"
                [error]="invalid('curp') ? t('auth.register.candidate.curpError') : null" formControlName="curp" />
              <ij-datepicker [label]="t('auth.register.candidate.birthDate')" [required]="true" [max]="today"
                [error]="invalid('birthDate') ? t('auth.register.candidate.birthDateError') : null" formControlName="birthDate" />
            </div>
          }

          <!-- Paso 3: Perfil y ubicación -->
          @if (step() === 2) {
            <div class="space-y-4">
              <ij-input [label]="t('auth.register.candidate.professionalTitle')" [placeholder]="t('auth.register.candidate.professionalTitlePlaceholder')" formControlName="professionalTitle" />
              <div class="grid grid-cols-2 gap-3">
                <ij-select [label]="t('auth.register.candidate.state')" [required]="true" [options]="stateOptions"
                  [error]="invalid('state') ? t('auth.register.candidate.stateError') : null" formControlName="state" />
                <ij-input [label]="t('auth.register.candidate.municipality')" [placeholder]="t('auth.register.candidate.municipalityPlaceholder')" [required]="true"
                  [error]="invalid('municipality') ? t('auth.register.candidate.municipalityError') : null" formControlName="municipality" />
              </div>
            </div>
          }

          <!-- Navegación -->
          <div class="mt-7 flex items-center gap-3">
            @if (step() > 0) {
              <button ij-button type="button" variant="soft" shape="rounded" size="lg"
                class="flex-1" (click)="prev()">{{ t('auth.register.prev') }}</button>
            }
            @if (step() < 2) {
              <button ij-button type="button" variant="primary" shape="rounded" size="lg"
                class="flex-1 shadow-search" (click)="next()">{{ t('auth.register.next') }}</button>
            } @else {
              <button ij-button type="submit" variant="primary" shape="rounded" size="lg"
                class="flex-1 shadow-search disabled:cursor-wait disabled:opacity-80"
                [disabled]="status() === 'loading'">
                @if (status() === 'loading') {
                  <span class="h-[17px] w-[17px] animate-spin rounded-full border-[2.4px] border-white/40 border-t-white"></span>
                }
                {{
                  status() === 'loading'
                    ? t('auth.register.creating')
                    : t('auth.register.submit')
                }}
              </button>
            }
          </div>
        </form>

        <p class="mt-6 text-center text-[13.5px] text-muted">
          {{ t('auth.register.candidate.isCompany') }}
          <a routerLink="/auth/registro/empresa" class="font-semibold text-brand-strong hover:text-brand-600">{{ t('auth.register.candidate.isCompanyLink') }}</a>
        </p>
        <p class="mt-1.5 text-center text-[13.5px] text-muted">
          {{ t('auth.register.haveAccount') }}
          <a routerLink="/auth/login" class="font-semibold text-brand-strong hover:text-brand-600">{{ t('auth.register.loginLink') }}</a>
        </p>
      }
    </div>
  `,
})
export class RegisterCandidatePage {
  private readonly api = inject(AuthApi);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject(AppTranslateService);

  protected readonly stepLabels = computed(() => [
    this.i18n.t('auth.register.steps.account'),
    this.i18n.t('auth.register.steps.personal'),
    this.i18n.t('auth.register.steps.location'),
  ]);
  protected readonly documentTypeOptions: IjOption[] = DOCUMENT_TYPES.map((d) => ({
    value: d.value,
    label: d.label,
  }));
  protected readonly stateOptions: IjOption[] = MX_STATES.map((s) => ({
    value: s.code,
    label: s.name,
  }));
  protected readonly today = new Date().toISOString().slice(0, 10);
  protected readonly passwordHint = computed(() =>
    this.i18n.t('validation.passwordPolicy'),
  );

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
      firstName: this.fb.control('', [Validators.required, Validators.maxLength(80)]),
      lastName: this.fb.control('', [Validators.required, Validators.maxLength(80)]),
      documentType: this.fb.control('', [Validators.required]),
      documentNumber: this.fb.control('', [Validators.required, Validators.maxLength(40)]),
      curp: this.fb.control('', [curpValidator]),
      birthDate: this.fb.control('', [Validators.required, notFutureDateValidator]),
      professionalTitle: this.fb.control(''),
      state: this.fb.control('', [Validators.required]),
      municipality: this.fb.control('', [Validators.required, Validators.maxLength(120)]),
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
    STEP_CONTROLS[index].forEach((name) => this.form.get(name)!.markAsTouched());
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
        accountType: 'candidate',
        email: v.email,
        password: v.password,
        candidate: {
          firstName: v.firstName,
          lastName: v.lastName,
          documentType: v.documentType,
          documentNumber: v.documentNumber,
          curp: v.curp ? v.curp.trim().toUpperCase() : undefined,
          birthDate: v.birthDate,
          professionalTitle: v.professionalTitle || undefined,
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
    switch (this.errorCodeOf(error)) {
      case AuthErrorCode.EMAIL_ALREADY_EXISTS:
        this.step.set(0);
        this.form.controls.email.setErrors({ taken: true });
        this.errorMessage.set(this.i18n.t('auth.register.emailTaken'));
        break;
      case AuthErrorCode.CANDIDATE_DOCUMENT_ALREADY_EXISTS:
        this.step.set(1);
        this.form.controls.documentNumber.setErrors({ taken: true });
        this.errorMessage.set(
          this.i18n.t('auth.register.candidate.documentTaken'),
        );
        break;
      case AuthErrorCode.INVALID_BIRTH_DATE:
        this.step.set(1);
        this.form.controls.birthDate.setErrors({ invalid: true });
        this.errorMessage.set(
          this.i18n.t('auth.register.candidate.birthDateInvalid'),
        );
        break;
      default:
        this.errorMessage.set(this.i18n.t('auth.register.genericError'));
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
