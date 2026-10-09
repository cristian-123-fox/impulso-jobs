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

  login(credentials: LoginCredentials): void {
    this.pendingEmail = credentials.email;
    this.start();
    this.api
      .login({ email: credentials.email, password: credentials.password })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => this.onSuccess(response),
        error: (error: unknown) => this.handleError(error),
      });
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
