import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { IjButton, IjInput } from '@/shared/ui';
import {
  AccountProfile,
  UpdateAccountProfilePayload,
} from '@/features/account/models/account.models';

/**
 * Identidad de la cuenta: lo que vive en `users`. Todos los campos son
 * opcionales — nadie queda bloqueado por no querer poner su teléfono.
 *
 * Sólo se envía lo que cambió: mandar el formulario entero convertiría un
 * campo que el usuario nunca tocó en una escritura, y el backend trata la
 * cadena vacía como "bórralo".
 */
@Component({
  selector: 'app-account-identity-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, IjButton, IjInput],
  host: { class: 'block' },
  template: `
    <form novalidate [formGroup]="form" (ngSubmit)="onSubmit()">
      <div class="grid gap-4 sm:grid-cols-2">
        <ij-input label="Nombre(s)" placeholder="Oscar" formControlName="firstName" />
        <ij-input label="Apellidos" placeholder="Ruiz" formControlName="lastName" />
        <ij-input
          label="Teléfono"
          type="tel"
          placeholder="3312345678"
          formControlName="phone"
        />
        <ij-input
          label="Puesto o cargo"
          placeholder="Coordinador de soporte"
          formControlName="jobTitle"
        />
      </div>

      @if (error(); as message) {
        <p
          role="alert"
          class="mt-4 rounded-lg bg-red-50 px-3 py-2 text-[13px] font-medium text-red-700"
        >
          {{ message }}
        </p>
      }

      <div class="mt-4 flex items-center justify-end gap-3">
        @if (saved()) {
          <span class="mr-auto text-[12.5px] font-semibold text-accent-green-strong">
            Cambios guardados.
          </span>
        }
        <button
          ij-button
          type="submit"
          variant="primary"
          shape="rounded"
          size="sm"
          [disabled]="submitting()"
        >
          {{ submitting() ? 'Guardando…' : 'Guardar cambios' }}
        </button>
      </div>
    </form>
  `,
})
export class AccountIdentityForm {
  readonly profile = input.required<AccountProfile>();
  readonly submitting = input(false);
  readonly saved = input(false);
  readonly error = input<string | null>(null);
  readonly save = output<UpdateAccountProfilePayload>();

  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly form = this.fb.group({
    firstName: this.fb.control(''),
    lastName: this.fb.control(''),
    phone: this.fb.control(''),
    jobTitle: this.fb.control(''),
  });

  constructor() {
    // El perfil llega de una petición, así que el formulario se rellena cuando
    // aterriza y se vuelve a rellenar tras guardar (el backend devuelve la fila
    // ya recortada, y así el estado "sucio" se reinicia).
    effect(() => {
      const profile = this.profile();
      this.form.reset({
        firstName: profile.firstName ?? '',
        lastName: profile.lastName ?? '',
        phone: profile.phone ?? '',
        jobTitle: profile.jobTitle ?? '',
      });
    });
  }

  protected onSubmit(): void {
    const value = this.form.getRawValue();
    const profile = this.profile();
    const payload: UpdateAccountProfilePayload = {};

    if (value.firstName.trim() !== (profile.firstName ?? '')) {
      payload.firstName = value.firstName.trim();
    }
    if (value.lastName.trim() !== (profile.lastName ?? '')) {
      payload.lastName = value.lastName.trim();
    }
    if (value.phone.trim() !== (profile.phone ?? '')) {
      payload.phone = value.phone.trim();
    }
    if (value.jobTitle.trim() !== (profile.jobTitle ?? '')) {
      payload.jobTitle = value.jobTitle.trim();
    }

    this.save.emit(payload);
  }
}
