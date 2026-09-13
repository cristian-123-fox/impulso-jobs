import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { LocaleFormatService } from '@/core/i18n/locale-format.service';
import { IjTextarea } from '@/shared/ui';
import { AdminCompanySubscription } from '@/features/admin/companies/models/companies.models';

/**
 * Retiro del plan (T34). No es un `app-admin-confirm` porque el motivo es
 * obligatorio y ese componente no pide texto.
 *
 * El aviso del cuerpo no es decorativo: **retirar no recorta lo ya concedido**
 * (decisión N13). El cupo de la base de talento sigue vivo hasta la fecha que
 * tenía, igual que cuando el plan vence solo. Si el administrador espera que
 * el acceso se corte en el acto, tiene que saber que no es así.
 */
@Component({
  selector: 'app-company-subscription-revoke-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, IjTextarea],
  template: `
    <form novalidate [formGroup]="form" (ngSubmit)="onSubmit()">
      @if (error()) {
        <p
          role="alert"
          class="mb-4 rounded-lg bg-red-50 px-3 py-2 text-[13px] font-medium text-red-700"
        >
          {{ error() }}
        </p>
      }

      <p class="text-[13.5px] text-body">
        La empresa quedará como una sin plan y podrá contratar uno nuevo cuando
        quiera. Las vacantes publicadas y las postulaciones recibidas se
        conservan.
      </p>

      <p
        class="mt-3 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[12.5px] text-body"
      >
        El cupo de la base de talento ya concedido
        <span class="font-bold">se respeta{{ untilLabel() }}</span
        >, igual que cuando el plan vence por su cuenta. Para cortarlo antes hay
        que cambiar la vigencia primero.
      </p>

      <div class="mt-4">
        <ij-textarea
          label="Motivo"
          [required]="true"
          [rows]="2"
          [maxLength]="500"
          hint="Queda en auditoría: quién retiró el plan y por qué."
          formControlName="reason"
        />
      </div>

      <div class="mt-6 flex justify-end gap-3 border-t border-line pt-4">
        <button
          type="button"
          class="rounded-xl border border-line bg-white px-4 py-2.5 text-[13.5px] font-bold text-body transition-colors hover:bg-surface"
          (click)="cancel.emit()"
        >
          Cancelar
        </button>
        <button
          type="submit"
          class="rounded-xl bg-red-600 px-4 py-2.5 text-[13.5px] font-bold text-white transition-colors hover:bg-red-700 active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60"
          [disabled]="submitting() || form.invalid"
        >
          {{ submitting() ? 'Retirando…' : 'Retirar plan' }}
        </button>
      </div>
    </form>
  `,
})
export class CompanySubscriptionRevokeForm {
  readonly subscription = input.required<AdminCompanySubscription>();
  readonly submitting = input(false);
  readonly error = input<string | null>(null);
  readonly confirm = output<string>();
  readonly cancel = output<void>();

  private readonly fb = inject(NonNullableFormBuilder);
  private readonly format = inject(LocaleFormatService);

  protected readonly form = this.fb.group({
    reason: this.fb.control('', [
      Validators.required,
      Validators.minLength(5),
      Validators.maxLength(500),
    ]),
  });

  protected untilLabel(): string {
    const end = this.subscription().currentPeriodEnd;
    return end ? ` hasta el ${this.format.longDate(end)}` : '';
  }

  protected onSubmit(): void {
    if (this.form.invalid) return;
    this.confirm.emit(this.form.getRawValue().reason.trim());
  }
}
