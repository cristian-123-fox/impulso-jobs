import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '@/core/auth/auth.service';
import { AppTranslateService } from '@/core/i18n/app-translate.service';
import { ApiErrorResponse } from '@/core/models/api-response.models';
import { LoginResponse } from '@/core/models/auth.models';
import { AuthErrorCode } from '@/core/models/error-code.enum';
import { AuthApi } from '@/features/public/auth/data/auth.api';
import {
  LoginCredentials,
  LoginStatus,
  ResendStatus,
} from '@/features/public/auth/models/auth.models';

/**
 * Fachada del login: expone el estado de la vista (con Signals) y orquesta el
 * envío contra la API, la sesión y la redirección por rol.
 */
@Injectable()
export class LoginFacade {
  private readonly api = inject(AuthApi);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject(AppTranslateService);

  readonly status = signal<LoginStatus>('idle');
  readonly errorMessage = signal<string | null>(null);
  readonly showResend = signal(false);
  readonly resendStatus = signal<ResendStatus>('idle');

  private pendingEmail = '';
  private pendingPassword = '';
  private pendingAccountType: 'candidate' | 'company' = 'candidate';
  /** Evita reintentar en bucle si el backend vuelve a rechazar el tipo. */
  private accountTypeRetried = false;

  login(credentials: LoginCredentials): void {
    this.pendingEmail = credentials.email;
    this.pendingPassword = credentials.password;
    this.pendingAccountType = credentials.accountType;
    this.accountTypeRetried = false;
    this.start();
    this.sendLogin();
  }

  private sendLogin(): void {
    this.api
      .login({
        email: this.pendingEmail,
        password: this.pendingPassword,
        accountType: this.pendingAccountType,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => this.onSuccess(response),
        error: (error: unknown) => this.handleLoginError(error),
      });
  }

  /**
   * Si la cuenta es del otro tipo, se reintenta una vez en la pestaña correcta
   * en lugar de dejar al usuario fuera. El backend ya validó la contraseña y
   * auditó el intento; el reintento sólo corrige la pestaña elegida.
   */
  private handleLoginError(error: unknown): void {
    if (
      this.errorCodeOf(error) === AuthErrorCode.WRONG_ACCOUNT_TYPE &&
      !this.accountTypeRetried
    ) {
      this.accountTypeRetried = true;
      this.pendingAccountType =
        this.pendingAccountType === 'company' ? 'candidate' : 'company';
      this.status.set('loading');
      this.errorMessage.set(null);
      this.sendLogin();
      return;
    }
    this.handleError(error);
  }

  /** El ID token de Google sigue el mismo camino que cualquier login. */
  loginWithGoogle(credential: string): void {
    this.start();
    this.api
      .googleLogin(credential)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => this.onSuccess(response),
        error: (error: unknown) => this.handleError(error),
      });
  }

  private start(): void {
    this.status.set('loading');
    this.errorMessage.set(null);
    this.showResend.set(false);
    this.resendStatus.set('idle');
  }

  private onSuccess(response: LoginResponse): void {
    this.pendingPassword = '';
    this.auth.setSession(response);
    this.status.set('success');
    // Sólo rutas internas: un returnUrl externo sería un open redirect.
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    const target =
      returnUrl?.startsWith('/') && !returnUrl.startsWith('//')
        ? returnUrl
        : this.auth.redirectUrlFor(response.user.role);
    void this.router.navigateByUrl(target);
  }

  resendVerification(): void {
    if (!this.pendingEmail) return;
    this.resendStatus.set('sending');
    this.api
      .resendVerification(this.pendingEmail)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.resendStatus.set('sent'),
        error: () => this.resendStatus.set('error'),
      });
  }

  /**
   * El aviso se elige por **`errorCode`**, no por el `message` del envelope:
   * ese viene siempre en español desde el backend, y es justo el motivo por el
   * que T26 traduce los errores en el cliente.
   */
  private handleError(error: unknown): void {
    this.pendingPassword = '';
    this.status.set('error');
    switch (this.errorCodeOf(error)) {
      case AuthErrorCode.INVALID_CREDENTIALS:
        this.errorMessage.set(this.i18n.t('auth.errors.invalidCredentials'));
        break;
      case AuthErrorCode.ACCOUNT_BLOCKED:
        this.errorMessage.set(this.i18n.t('auth.errors.blocked'));
        break;
      case AuthErrorCode.ACCOUNT_INACTIVE:
        this.errorMessage.set(this.i18n.t('auth.errors.inactive'));
        break;
      case AuthErrorCode.WRONG_ACCOUNT_TYPE:
        // El mensaje dice a qué pestaña tiene que ir, no sólo que falló.
        this.errorMessage.set(
          this.i18n.t(
            this.pendingAccountType === 'company'
              ? 'auth.errors.wrongAccountTypeCompany'
              : 'auth.errors.wrongAccountTypeCandidate',
          ),
        );
        break;
      case AuthErrorCode.EMAIL_NOT_VERIFIED:
        this.errorMessage.set(this.i18n.t('auth.errors.notVerified'));
        this.showResend.set(true);
        break;
      case AuthErrorCode.GOOGLE_INVALID_TOKEN:
        this.errorMessage.set(this.i18n.t('auth.errors.googleInvalid'));
        break;
      case AuthErrorCode.GOOGLE_NOT_CONFIGURED:
        this.errorMessage.set(this.i18n.t('auth.errors.googleNotConfigured'));
        break;
      case AuthErrorCode.GOOGLE_SIGNUP_REQUIRED:
        this.errorMessage.set(this.i18n.t('auth.errors.googleSignupRequired'));
        break;
      case AuthErrorCode.LEGAL_CONSENT_REQUIRED:
        this.errorMessage.set(this.i18n.t('auth.errors.legalFirstTime'));
        break;
      case AuthErrorCode.LEGAL_VERSION_OUTDATED:
        this.errorMessage.set(this.i18n.t('auth.errors.legalOutdated'));
        break;
      default:
        this.errorMessage.set(this.i18n.t('auth.errors.generic'));
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
