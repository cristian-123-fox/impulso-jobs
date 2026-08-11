import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
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
import {
  CreateRolePayload,
  RoleSummary,
} from '@/features/admin/roles/models/roles.models';

/**
 * Alta y edición de un rol (presentacional). El código identifica al rol en la
 * matriz de permisos y el backend no lo acepta en el `PUT`, así que al editar
 * se muestra deshabilitado.
 *
 * Los permisos se asignan en el detalle: son una matriz larga, no cabe aquí.
 */
@Component({
  selector: 'app-role-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, IjButton, IjInput],
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

      <div class="grid gap-4 sm:grid-cols-2">
        <ij-input
          label="Código"
          placeholder="CONTENT_MANAGER"
          [required]="true"
          [error]="
            invalid('code')
              ? 'Sólo letras, números y guion bajo (ej. CONTENT_MANAGER).'
              : null
          "
          formControlName="code"
        />
        <ij-input
          label="Nombre"
          placeholder="Gestor de contenidos"
          [required]="true"
          [error]="invalid('name') ? 'El nombre es obligatorio.' : null"
          formControlName="name"
        />
        <div class="sm:col-span-2">
          <ij-input label="Descripción (opcional)" formControlName="description" />
        </div>
      </div>

      <div class="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-line pt-4">
        <p class="mr-auto text-[12.5px] text-muted">
          Los permisos se asignan al abrir el rol.
        </p>
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
          {{ submitting() ? 'Guardando…' : role() ? 'Guardar cambios' : 'Crear rol' }}
        </button>
      </div>
    </form>
  `,
})
export class RoleForm implements OnInit {
  /** `null` en el alta; el rol a editar en caso contrario. */
  readonly role = input<RoleSummary | null>(null);
  readonly submitting = input(false);
  readonly error = input<string | null>(null);
  readonly save = output<CreateRolePayload>();
  readonly cancel = output<void>();

  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly form = this.fb.group({
    code: this.fb.control('', [
      Validators.required,
      Validators.pattern(/^[A-Za-z][A-Za-z0-9_]*$/),
    ]),
    name: this.fb.control('', [Validators.required]),
    description: this.fb.control(''),
  });

  ngOnInit(): void {
    const role = this.role();
    if (!role) return;

    this.form.setValue({
      code: role.code,
      name: role.name,
      description: role.description ?? '',
    });
    this.form.controls.code.disable();
  }

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
    this.save.emit({
      code: value.code.toUpperCase(),
      name: value.name.trim(),
      description: value.description.trim() || undefined,
    });
  }
}
