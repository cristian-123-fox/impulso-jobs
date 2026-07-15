import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
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
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthApi } from '@/features/public/auth/data/auth.api';
import {
  VerifyResendStatus,
  VerifyState,
} from '@/features/public/auth/models/auth.models';
import { IjButton, IjIcon } from '@/shared/ui';

const INPUT_BASE =
  'w-full rounded-xl border bg-surface px-4 py-3.5 text-[15px] text-body ' +
  'outline-none transition placeholder:text-muted focus:ring-2';

/**
 * Confirma la verificación de correo a partir del `?token=` del magic link.
 * Ejecuta la confirmación sólo en navegador (evita el prerender SSR) y, si el
 * enlace ya no sirve, ofrece reenviar uno nuevo.
 */
@Component({
  selector: 'app-verify-email-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
  imports: [ReactiveFormsModule, RouterLink, IjButton, IjIcon],
  template: `
    <div class="w-full rounded-[20px] bg-white p-8 shadow-float sm:p-9">
      @switch (state()) {
        @case ('verifying') {
          <div class="flex flex-col items-center py-8 text-center">
            <span
              class="h-8 w-8 animate-spin rounded-full border-[3px] border-brand/25 border-t-brand"
              aria-hidden="true"
            ></span>
            <p class="mt-4 text-[14.5px] text-muted">Verificando tu correo…</p>
          </div>
        }

        @case ('success') {
          <div class="text-center">
            <span
              class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-green-soft text-accent-green"
            >
              <ij-icon name="check" [size]="28" [strokeWidth]="2.6" />
            </span>
            <h1 class="text-[22px] font-bold tracking-tight text-ink-900">
              {{ alreadyVerified() ? 'Tu correo ya estaba verificado' : 'Correo verificado' }}
            </h1>
            <p class="mt-2 text-[14.5px] leading-relaxed text-muted">
              Tu cuenta está lista. Ya puedes iniciar sesión.
            </p>
            <a
              ij-button
              routerLink="/auth/login"
              variant="primary"
              shape="rounded"
              size="lg"
              class="mt-6 w-full shadow-search"
            >
              Iniciar sesión
            </a>
          </div>
        }

        @default {
          <!-- invalid: enlace inválido/expirado/usado + reenvío -->
          <div class="text-center">
            <span
              class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600"
            >
              <ij-icon name="alert-triangle" [size]="26" />
            </span>
            <h1 class="text-[22px] font-bold tracking-tight text-ink-900">
              Enlace inválido o expirado
            </h1>
            <p class="mt-2 text-[14.5px] leading-relaxed text-muted">
              Este enlace de verificación ya no sirve. Ingresa tu correo y te enviaremos
              uno nuevo.
            </p>
          </div>

          @if (resendStatus() === 'sent') {
            <div
              role="status"
              class="mt-6 flex items-center gap-2.5 rounded-xl border border-accent-green/25 bg-accent-green-soft px-3.5 py-3 text-[13.5px] font-semibold text-accent-green"
            >
              <ij-icon name="mail" [size]="18" />
              <span>Si el correo requiere verificación, te enviamos un nuevo enlace.</span>
            </div>
          } @else {
            <form novalidate class="mt-6" [formGroup]="form" (ngSubmit)="onResend()">
              <label for="ve-email" class="mb-2 block text-sm font-semibold text-ink-900">
                Correo electrónico
              </label>
              <input
                id="ve-email"
                type="email"
                formControlName="email"
                autocomplete="email"
                placeholder="tucorreo@ejemplo.com"
                [class]="inputClass()"
                [attr.aria-invalid]="emailInvalid()"
              />
              @if (emailInvalid()) {
                <p class="mt-1.5 text-xs font-medium text-red-600">Ingresa un correo válido.</p>
              }
              <button
                ij-button
                type="submit"
                variant="primary"
                shape="rounded"
                size="lg"
                class="mt-6 w-full shadow-search disabled:cursor-wait disabled:opacity-80"
                [disabled]="resendStatus() === 'loading'"
              >
                @if (resendStatus() === 'loading') {
                  <span
                    class="h-[17px] w-[17px] animate-spin rounded-full border-[2.4px] border-white/40 border-t-white"
                    aria-hidden="true"
                  ></span>
                }
                {{ resendStatus() === 'loading' ? 'Enviando…' : 'Enviar nuevo enlace' }}
              </button>
            </form>
          }

          <a
            routerLink="/auth/login"
            class="mt-6 flex items-center justify-center gap-1.5 text-[13.5px] font-semibold text-muted transition-colors hover:text-brand"
          >
            <ij-icon name="chevron-left" [size]="16" />
            Volver a iniciar sesión
          </a>
        }
      }
    </div>
  `,
})
export class VerifyEmailPage {
  private readonly api = inject(AuthApi);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly state = signal<VerifyState>('verifying');
  protected readonly alreadyVerified = signal(false);
  protected readonly resendStatus = signal<VerifyResendStatus>('idle');

  private readonly token = this.route.snapshot.queryParamMap.get('token') ?? '';

  protected readonly form = this.fb.group({
    email: this.fb.control('', [Validators.required, Validators.email]),
  });

  protected readonly isVerifying = computed(() => this.state() === 'verifying');

  constructor() {
    // Confirmar golpea la API: sólo en navegador (evita el prerender SSR).
    afterNextRender(() => this.confirm());
  }

  private confirm(): void {
    if (!this.token) {
      this.state.set('invalid');
      return;
    }
    this.api
      .confirmEmailVerification(this.token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.alreadyVerified.set(result.alreadyVerified);
          this.state.set('success');
        },
        error: () => this.state.set('invalid'),
      });
  }

  protected emailInvalid(): boolean {
    const control = this.form.controls.email;
    return control.invalid && (control.dirty || control.touched);
  }

  protected inputClass(): string {
    return this.emailInvalid()
      ? `${INPUT_BASE} border-red-300 focus:border-red-400 focus:ring-red-200/70`
      : `${INPUT_BASE} border-line focus:border-brand focus:ring-brand/25`;
  }

  protected onResend(): void {
    if (this.resendStatus() === 'loading') return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const email = this.form.getRawValue().email.trim();
    this.resendStatus.set('loading');

    // Respuesta genérica: mostramos 'sent' pase lo que pase.
    const done = (): void => this.resendStatus.set('sent');
    this.api
      .resendVerification(email)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: done, error: done });
  }
}
