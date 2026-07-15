import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AuthFacade } from '@/features/auth/data/auth.facade';
import {
  LoginCredentials,
  LoginStatus,
} from '@/features/auth/models/auth.models';
import { LoginForm } from '@/features/auth/components/login-form/login-form';
import { IjLogo } from '@/shared/ui';

/**
 * Contenedor de la pantalla de acceso. Orquesta el envío del formulario contra
 * el `AuthFacade` y traduce el resultado al estado que consume la tarjeta.
 */
@Component({
  selector: 'app-login-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IjLogo, LoginForm],
  template: `
    <main
      class="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface px-5 py-10"
    >
      <!-- Decoración de fondo -->
      <div
        class="pointer-events-none absolute -right-24 -top-32 h-[420px] w-[560px] rounded-full bg-brand-50 opacity-70 blur-3xl"
        aria-hidden="true"
      ></div>
      <div
        class="pointer-events-none absolute -bottom-40 -left-28 h-[520px] w-[640px] rounded-full bg-brand-50 opacity-60 blur-3xl"
        aria-hidden="true"
      ></div>
      <div
        class="pointer-events-none absolute right-16 top-16 hidden h-56 w-80 opacity-60 md:block"
        style="background-image: repeating-linear-gradient(-45deg, #eceef3 0 1px, transparent 1px 12px);"
        aria-hidden="true"
      ></div>
      <div
        class="pointer-events-none absolute bottom-16 left-16 hidden h-64 w-80 opacity-60 md:block"
        style="background-image: repeating-linear-gradient(-45deg, #eceef3 0 1px, transparent 1px 12px);"
        aria-hidden="true"
      ></div>

      <div class="relative flex w-full max-w-[440px] flex-col items-center">
        <a routerLink="/" class="mb-7 inline-flex" aria-label="Impulso Jobs — inicio">
          <ij-logo />
        </a>

        <app-login-form
          [status]="status()"
          [errorMessage]="errorMessage()"
          (submitted)="onLogin($event)"
        />
      </div>
    </main>
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthFacade);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly status = signal<LoginStatus>('idle');
  protected readonly errorMessage = signal<string | null>(null);

  protected onLogin(credentials: LoginCredentials): void {
    this.status.set('loading');
    this.errorMessage.set(null);

    this.auth
      .login(credentials)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        // TODO(iam): al integrar el backend, persistir la sesión y redirigir al
        // panel correspondiente según el rol autenticado.
        next: () => this.status.set('success'),
        error: (err: Error) => {
          this.status.set('error');
          this.errorMessage.set(err.message);
        },
      });
  }
}
