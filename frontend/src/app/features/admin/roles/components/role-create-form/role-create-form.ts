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
import { IjButton, IjInput } from '@/shared/ui';
import { CreateRolePayload } from '@/features/admin/roles/models/roles.models';

/** Formulario de creación de rol (presentacional). */
@Component({
  selector: 'app-role-create-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, IjButton, IjInput],
  template: `
    <form
      [formGroup]="form"
      class="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6"
      (ngSubmit)="onSubmit()"
    >
      <h3 class="text-base font-bold text-ink-900">Nuevo rol</h3>
      @if (error()) {
        <p class="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[13px] font-medium text-red-700">
          {{ error() }}
        </p>
      }
      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        <ij-input label="Código" placeholder="CONTENT_MANAGER" [required]="true"
          [error]="invalid('code') ? 'Sólo letras, números y guion bajo (ej. CONTENT_MANAGER).' : null"
          formControlName="code" />
        <ij-input label="Nombre" placeholder="Gestor de contenidos" [required]="true"
          [error]="invalid('name') ? 'El nombre es obligatorio.' : null" formControlName="name" />
        <div class="sm:col-span-2">
          <ij-input label="Descripción (opcional)" formControlName="description" />
        </div>
      </div>
      <div class="mt-5 flex justify-end gap-3">
        <button
          type="button"
          class="rounded-xl border border-line bg-white px-4 py-2.5 text-[13.5px] font-bold text-body transition-colors hover:bg-surface"
          (click)="cancel.emit()"
        >
          Cancelar
        </button>
        <button
          ij-button
          type="submit"
          variant="primary"
          shape="rounded"
          size="md"
          [disabled]="submitting()"
        >
          Crear rol
        </button>
      </div>
    </form>
  `,
})
export class RoleCreateForm {
  readonly submitting = input(false);
  readonly error = input<string | null>(null);
  readonly create = output<CreateRolePayload>();
  readonly cancel = output<void>();

  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly form = this.fb.group({
    code: this.fb.control('', [Validators.required, Validators.pattern(/^[A-Za-z][A-Za-z0-9_]*$/)]),
    name: this.fb.control('', [Validators.required]),
    description: this.fb.control(''),
  });

  protected invalid(name: 'code' | 'name'): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.dirty || control.touched);
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.create.emit({
      code: value.code.toUpperCase(),
      name: value.name.trim(),
      description: value.description.trim() || undefined,
    });
  }
}
