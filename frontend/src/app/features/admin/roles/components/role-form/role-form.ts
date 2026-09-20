import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { IjButton, IjIcon, IjInput } from '@/shared/ui';
import {
  CreateRolePayload,
  ROLE_SCOPE_META,
  RoleScope,
  RoleSummary,
} from '@/features/admin/roles/models/roles.models';

/**
 * Alta y edición de un rol (presentacional). El código identifica al rol en la
 * matriz de permisos y el backend no lo acepta en el `PUT`, así que al editar
 * se muestra deshabilitado.
 *
 * El **ámbito** tampoco se edita, y ni siquiera se elige aquí: lo fija la
 * pestaña desde la que se abrió el formulario. Cambiarlo después dejaría al rol
 * con permisos que ya no aplican a quien lo usa.
 *
 * Los permisos se asignan en el detalle: son un árbol largo, no cabe aquí.
 */
@Component({
  selector: 'app-role-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, IjButton, IjIcon, IjInput],
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

      <div
        class="mb-4 flex items-center gap-2.5 rounded-xl border border-line bg-surface/60 px-3.5 py-3"
      >
        <ij-icon [name]="scopeMeta().icon" [size]="18" class="text-brand-strong" />
        <span class="min-w-0">
          <span class="block text-[13px] font-bold text-ink-900">
            Rol de {{ scopeMeta().label.toLowerCase() }}
          </span>
          <span class="block text-[12.5px] leading-snug text-muted">
            {{ scopeMeta().hint }}
          </span>
        </span>
      </div>

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
  /** Ámbito del rol a crear. Al editar manda el del propio rol. */
  readonly scope = input<RoleScope>('PLATFORM');
  readonly submitting = input(false);
  readonly error = input<string | null>(null);
  readonly save = output<CreateRolePayload>();
  readonly cancel = output<void>();

  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly scopeMeta = computed(
    () => ROLE_SCOPE_META[this.role()?.scope ?? this.scope()],
  );

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
      scope: this.role()?.scope ?? this.scope(),
      description: value.description.trim() || undefined,
    });
  }
}
