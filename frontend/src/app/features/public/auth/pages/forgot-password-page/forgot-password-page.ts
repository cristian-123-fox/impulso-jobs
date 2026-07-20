import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthApi } from '@/features/public/auth/data/auth.api';
import { ForgotStatus } from '@/features/public/auth/models/auth.models';
import { IjButton, IjIcon, IjInput } from '@/shared/ui';

/**
 * Solicita el enlace de recuperación. La respuesta del backend es genérica, así
 * que la vista muestra siempre la misma confirmación (no revela si el correo
 * existe), incluso ante un error de red.
 */
@Component({
  selector: 'app-forgot-password-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
  imports: [ReactiveFormsModule, RouterLink, IjButton, IjIcon, IjInput],
  template: `
    <div class="w-full rounded-[20px] bg-white p-8 shadow-float sm:p-9">
      @if (status() === 'sent') {
        <div class="text-center">
          <span
            class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-green-soft text-accent-green"
          >
            <ij-icon name="mail" [size]="26" />
          </span>
          <h1 class="text-[22px] font-bold tracking-tight text-ink-900">Revisa tu correo</h1>
          <p class="mt-2 text-[14.5px] leading-relaxed text-muted">
            Si <b class="text-ink-900">{{ sentEmail() }}</b> está registrado, te enviamos un
            enlace para restablecer tu contraseña. Expira en 30 minutos.
          </p>
          <p class="mt-4 text-[13px] text-muted">
            ¿No lo ves? Revisa tu carpeta de spam o
            <button
              type="button"
              class="font-semibold text-brand transition-colors hover:text-brand-600"
              (click)="reset()"
            >
              intenta con otro correo
            </button>.
          </p>
          <a
            routerLink="/auth/login"
            class="mt-6 inline-flex items-center justify-center gap-1.5 text-[13.5px] font-semibold text-brand transition-colors hover:text-brand-600"
          >
            <ij-icon name="chevron-left" [size]="16" />
            Volver a iniciar sesión
          </a>
        </div>
      } @else {
        <h1 class="text-[25px] font-bold tracking-tight text-ink-900">Recuperar contraseña</h1>
        <p class="mt-2 text-[15px] text-muted">
          Ingresa tu correo y te enviaremos un enlace para restablecerla.
        </p>

        <form novalidate class="mt-6" [formGroup]="form" (ngSubmit)="onSubmit()">
          <ij-input
            label="Correo electrónico"
            type="email"
            autocomplete="email"
            placeholder="tucorreo@ejemplo.com"
            formControlName="email"
          />

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
            {{ isLoading() ? 'Enviando…' : 'Enviar enlace' }}
          </button>
        </form>

        <a
          routerLink="/auth/login"
          class="mt-6 flex items-center justify-center gap-1.5 text-[13.5px] font-semibold text-muted transition-colors hover:text-brand"
        >
          <ij-icon name="chevron-left" [size]="16" />
          Volver a iniciar sesión
        </a>
      }
    </div>
  `,
})
export class ForgotPasswordPage {
  private readonly api = inject(AuthApi);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly status = signal<ForgotStatus>('idle');
  protected readonly sentEmail = signal('');

  protected readonly form = this.fb.group({
    email: this.fb.control('', [Validators.required, Validators.email]),
  });

  protected readonly isLoading = computed(() => this.status() === 'loading');

  protected reset(): void {
    this.form.reset({ email: '' });
    this.status.set('idle');
  }

  protected onSubmit(): void {
    if (this.isLoading()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const email = this.form.getRawValue().email.trim();
    this.status.set('loading');

    // Respuesta genérica: nunca revelamos si el correo existe → 'sent' pase lo
    // que pase (éxito o error de red).
    const done = (): void => {
      this.sentEmail.set(email);
      this.status.set('sent');
    };

    this.api
      .requestPasswordReset(email)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: done, error: done });
  }
}
