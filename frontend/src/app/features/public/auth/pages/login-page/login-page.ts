import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs/operators';
import { TranslocoDirective } from '@jsverse/transloco';
import { IjIcon } from '@/shared/ui';
import { LoginFacade } from '@/features/public/auth/data/auth.facade';
import { LoginForm } from '@/features/public/auth/components/login-form/login-form';

/**
 * Contenedor del login: enlaza el estado de la fachada con la tarjeta de acceso
 * y reenvía sus eventos. La fachada se provee a nivel de página (estado fresco).
 *
 * `?passwordChanged=1` lo pone «Mi cuenta» al cambiar la contraseña: el backend
 * invalida todas las sesiones, así que el usuario aterriza aquí de golpe y sin
 * el aviso parecería que se le ha caído la sesión sola.
 */
@Component({
  selector: 'app-login-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
  imports: [LoginForm, IjIcon, TranslocoDirective],
  providers: [LoginFacade],
  template: `
    <ng-container *transloco="let t">
      @if (passwordChanged()) {
        <div
          role="status"
          class="mx-auto mb-4 flex max-w-[420px] items-start gap-2.5 rounded-xl bg-accent-green-soft px-3.5 py-3 text-accent-green-strong"
        >
          <ij-icon name="check" [size]="17" class="mt-px flex-none" />
          <p class="text-[12.5px] font-semibold leading-snug">
            {{ t('auth.login.passwordChanged') }}
          </p>
        </div>
      }

      <app-login-form
        [status]="facade.status()"
        [errorMessage]="facade.errorMessage()"
        [showResend]="facade.showResend()"
        [resendStatus]="facade.resendStatus()"
        (submitted)="facade.login($event)"
        (resendRequested)="facade.resendVerification()"
      />
    </ng-container>
  `,
})
export class LoginPage {
  protected readonly facade = inject(LoginFacade);
  private readonly route = inject(ActivatedRoute);

  protected readonly passwordChanged = toSignal(
    this.route.queryParamMap.pipe(
      map((params) => params.get('passwordChanged') === '1'),
    ),
    { initialValue: false },
  );
}
