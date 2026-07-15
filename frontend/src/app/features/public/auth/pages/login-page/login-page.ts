import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LoginFacade } from '@/features/public/auth/data/auth.facade';
import { LoginForm } from '@/features/public/auth/components/login-form/login-form';

/**
 * Contenedor del login: enlaza el estado de la fachada con la tarjeta de acceso
 * y reenvía sus eventos. La fachada se provee a nivel de página (estado fresco).
 */
@Component({
  selector: 'app-login-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
  imports: [LoginForm],
  providers: [LoginFacade],
  template: `
    <app-login-form
      [status]="facade.status()"
      [errorMessage]="facade.errorMessage()"
      [showResend]="facade.showResend()"
      [resendStatus]="facade.resendStatus()"
      (submitted)="facade.login($event)"
      (resendRequested)="facade.resendVerification()"
    />
  `,
})
export class LoginPage {
  protected readonly facade = inject(LoginFacade);
}
