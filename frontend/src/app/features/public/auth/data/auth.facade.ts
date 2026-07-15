import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '@/core/auth/auth.service';
import { ApiErrorResponse } from '@/core/models/api-response.models';
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
  private readonly destroyRef = inject(DestroyRef);

  readonly status = signal<LoginStatus>('idle');
  readonly errorMessage = signal<string | null>(null);
  readonly showResend = signal(false);
  readonly resendStatus = signal<ResendStatus>('idle');

  private pendingEmail = '';

  login(credentials: LoginCredentials): void {
    this.status.set('loading');
    this.errorMessage.set(null);
    this.showResend.set(false);
    this.resendStatus.set('idle');
    this.pendingEmail = credentials.email;

    this.api
      .login({ email: credentials.email, password: credentials.password })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.auth.setSession(response);
          this.status.set('success');
          void this.router.navigateByUrl(this.auth.redirectUrlFor(response.user.role));
        },
        error: (error: unknown) => this.handleError(error),
      });
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

  private handleError(error: unknown): void {
    this.status.set('error');
    switch (this.errorCodeOf(error)) {
      case AuthErrorCode.INVALID_CREDENTIALS:
        this.errorMessage.set('Correo o contraseña incorrectos.');
        break;
      case AuthErrorCode.ACCOUNT_BLOCKED:
        this.errorMessage.set(
          'Tu cuenta está bloqueada temporalmente. Espera unos minutos e intenta de nuevo.',
        );
        break;
      case AuthErrorCode.ACCOUNT_INACTIVE:
        this.errorMessage.set('Tu cuenta no está activa. Contacta a soporte.');
        break;
      case AuthErrorCode.EMAIL_NOT_VERIFIED:
        this.errorMessage.set('Debes verificar tu correo antes de iniciar sesión.');
        this.showResend.set(true);
        break;
      default:
        this.errorMessage.set('No pudimos iniciar sesión. Inténtalo más tarde.');
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
