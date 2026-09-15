import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Role } from '@/core/models/role.enum';
import { DOCUMENT_TYPES, MX_STATES } from '@/shared/catalogs/mx.catalogs';
import {
  IjButton,
  IjDatepicker,
  IjIcon,
  IjInput,
  IjOption,
  IjSelect,
} from '@/shared/ui';
import { notFutureDateValidator } from '@/shared/validators/mx-identifiers.validator';
import {
  PASSWORD_POLICY_HINT,
  passwordPolicyValidator,
} from '@/shared/validators/password.validator';
import { CompaniesApi } from '@/features/admin/companies/data/companies.api';
import { UsersApi } from '@/features/admin/users/data/users.api';
import { ExtraRolesPicker } from '@/features/admin/users/components/extra-roles-picker/extra-roles-picker';
import {
  AdminUser,
  CompanyMemberRole,
  ROLE_LABELS,
  STATUS_LABELS,
  UpdateUserPayload,
  UserStatus,
} from '@/features/admin/users/models/users.models';

/** Lo que devuelve el formulario: cambios de la cuenta y, aparte, sus roles. */
export interface UserEditResult {
  changes: UpdateUserPayload;
  /** `null` si la selección de roles adicionales no cambió. */
  extraRoleIds: string[] | null;
}

/**
 * Edición de una cuenta desde el back-office. Reorganizada en secciones:
 * Cuenta · Perfil · Roles y accesos. La contraseña es opcional — si se deja
 * vacía no se toca; al cambiarla, el backend invalida las sesiones vigentes.
 */
@Component({
  selector: 'app-user-edit-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    ExtraRolesPicker,
    IjButton,
    IjIcon,
    IjInput,
    IjSelect,
    IjDatepicker,
  ],
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

      <!-- ===== SECCIÓN: CUENTA ===== -->
      <h3 class="mb-3 text-[13px] font-bold uppercase tracking-wide text-muted">
        Cuenta
      </h3>
      <div class="grid gap-4 sm:grid-cols-2">
        <ij-input
          label="Correo electrónico"
          type="email"
          [required]="true"
          [error]="invalid('email') ? 'Ingresa un correo válido.' : null"
          formControlName="email"
        />
        <ij-select
          label="Rol de plataforma"
          [options]="roleOptions"
          [searchable]="false"
          [hint]="isSelf() ? 'No puedes cambiar tu propio rol.' : ''"
          formControlName="role"
        />
        <ij-select
          label="Estado"
          [options]="statusOptions"
          [searchable]="false"
          [hint]="isSelf() ? 'No puedes desactivar tu propia cuenta.' : ''"
          formControlName="status"
        />
        <ij-input
          label="Nueva contraseña (opcional)"
          [type]="showPassword() ? 'text' : 'password'"
          placeholder="Dejar vacío para no cambiarla"
          [hint]="passwordHint"
          [error]="invalid('password') ? passwordHint : null"
          formControlName="password"
        >
          <button
            ijSuffix
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-body"
            [attr.aria-label]="showPassword() ? 'Ocultar' : 'Mostrar'"
            (click)="showPassword.set(!showPassword())"
          >
            <ij-icon [name]="showPassword() ? 'eye-off' : 'eye'" [size]="19" />
          </button>
        </ij-input>
      </div>

      <label class="mt-4 flex items-center gap-2.5 text-[13.5px] text-body">
        <input
          type="checkbox"
          class="h-4 w-4 rounded border-line text-brand focus:ring-brand"
          formControlName="emailVerified"
        />
        Correo verificado (sin esto la cuenta no puede iniciar sesión)
      </label>

      <!-- ===== SECCIÓN: IDENTIDAD =====
           No se pinta para un candidato: su nombre, teléfono y título viven
           en candidate_profiles y se editan abajo. Duplicar los campos aquí
           dejaría dos orígenes para el mismo dato. -->
      @if (form.controls.role.value !== candidate) {
        <h3
          class="mb-3 mt-6 text-[13px] font-bold uppercase tracking-wide text-muted"
        >
          Identidad
        </h3>

        <div class="mb-4 flex items-center gap-4">
          <div
            class="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-surface"
          >
            @if (photoUrl(); as url) {
              <img [src]="url" alt="" class="h-full w-full object-cover" />
            } @else {
              <ij-icon name="user" [size]="26" class="text-muted" />
            }
          </div>
          <div class="space-y-2">
            <input
              #photoInput
              type="file"
              accept="image/png,image/jpeg,image/webp"
              class="hidden"
              (change)="onPhotoSelected($event)"
            />
            <div class="flex flex-wrap gap-2">
              <button
                ij-button
                type="button"
                variant="white"
                shape="rounded"
                size="sm"
                [disabled]="uploadingPhoto()"
                (click)="photoInput.click()"
              >
                {{ uploadingPhoto() ? 'Subiendo…' : 'Cambiar foto' }}
              </button>
              @if (photoUrl()) {
                <button
                  ij-button
                  type="button"
                  variant="white"
                  shape="rounded"
                  size="sm"
                  [disabled]="uploadingPhoto()"
                  (click)="removePhoto()"
                >
                  Quitar
                </button>
              }
            </div>
            <p class="text-[12.5px] text-muted">
              JPG, PNG o WebP · máximo 5 MB. Se guarda al instante.
            </p>
          </div>
        </div>

        @if (photoError(); as photoMessage) {
          <p
            role="alert"
            class="mb-4 rounded-lg bg-red-50 px-3 py-2 text-[13px] font-medium text-red-700"
          >
            {{ photoMessage }}
          </p>
        }

        <div class="grid gap-4 sm:grid-cols-2">
          <ij-input
            label="Nombre(s)"
            [required]="form.controls.role.value === admin"
            [error]="invalid('firstName') ? 'El nombre es obligatorio.' : null"
            formControlName="firstName"
          />
          <ij-input
            label="Apellidos"
            [required]="form.controls.role.value === admin"
            [error]="invalid('lastName') ? 'Los apellidos son obligatorios.' : null"
            formControlName="lastName"
          />
          <ij-input
            label="Teléfono"
            placeholder="3312345678"
            formControlName="phone"
          />
          <ij-input
            label="Puesto o cargo"
            placeholder="Coordinador de soporte"
            formControlName="jobTitle"
          />
        </div>
      }

      <!-- ===== SECCIÓN: PERFIL ===== -->
      @if (form.controls.role.value === candidate) {
        <h3
          class="mb-3 mt-6 text-[13px] font-bold uppercase tracking-wide text-muted"
        >
          Perfil del aspirante
        </h3>
        <div class="grid gap-4 sm:grid-cols-2">
          <ij-input
            label="Nombre(s)"
            [error]="invalid('cpFirstName') ? 'El nombre es obligatorio.' : null"
            formControlName="cpFirstName"
          />
          <ij-input
            label="Apellidos"
            [error]="invalid('cpLastName') ? 'El apellido es obligatorio.' : null"
            formControlName="cpLastName"
          />
          <ij-select
            label="Tipo de documento"
            [options]="documentTypeOptions"
            formControlName="cpDocumentType"
          />
          <ij-input
            label="Número de documento"
            formControlName="cpDocumentNumber"
          />
          <ij-input
            label="CURP"
            placeholder="GARC850101MVZRRL04"
            formControlName="cpCurp"
          />
          <ij-datepicker
            label="Fecha de nacimiento"
            [max]="today"
            formControlName="cpBirthDate"
          />
          <ij-input
            label="Teléfono"
            placeholder="3312345678"
            formControlName="cpPhone"
          />
          <ij-input
            label="Título profesional"
            placeholder="Ingeniero en Sistemas"
            formControlName="cpProfessionalTitle"
          />
          <ij-select
            label="Estado"
            [options]="stateOptions"
            formControlName="cpState"
          />
          <ij-input
            label="Municipio"
            placeholder="Zapopan"
            formControlName="cpMunicipality"
          />
        </div>
      }

      @if (form.controls.role.value === employer) {
        <h3
          class="mb-3 mt-6 text-[13px] font-bold uppercase tracking-wide text-muted"
        >
          Perfil de empresa
        </h3>
        <div class="grid gap-4 sm:grid-cols-2">
          <ij-select
            label="Empresa"
            [options]="companyOptions()"
            [error]="invalid('companyId') ? 'Selecciona la empresa.' : null"
            formControlName="companyId"
          />
          <ij-select
            label="Rol dentro de la empresa"
            [options]="companyRoleOptions"
            [searchable]="false"
            formControlName="companyRole"
          />
        </div>
        @if (selectedCompany(); as company) {
          <div class="mt-3 rounded-lg border border-line bg-surface/50 p-3">
            <p class="text-[12px] font-semibold text-body">{{ company.businessName }}</p>
            <div class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-muted">
              @if (company.rfc) {
                <span>RFC: {{ company.rfc }}</span>
              }
              @if (company.state) {
                <span>Estado: {{ company.state }}</span>
              }
              @if (company.municipality) {
                <span>Municipio: {{ company.municipality }}</span>
              }
              @if (company.taxRegime) {
                <span>Régimen: {{ company.taxRegime }}</span>
              }
            </div>
          </div>
        }
      }

      <!-- ===== SECCIÓN: ROLES Y ACCESOS ===== -->
      @if (form.controls.role.value === admin) {
        <h3
          class="mb-3 mt-6 text-[13px] font-bold uppercase tracking-wide text-muted"
        >
          Roles y accesos
        </h3>
        <app-extra-roles-picker [(selected)]="extraRoleIds" />
      }

      <!-- ===== NOTAS INTERNAS ===== -->
      <h3
        class="mb-3 mt-6 text-[13px] font-bold uppercase tracking-wide text-muted"
      >
        Notas internas
      </h3>
      <ij-input
        label="Notas del administrador"
        placeholder="Anotaciones sobre esta cuenta..."
        formControlName="adminNotes"
      />

      <div
        class="mt-6 flex justify-end gap-3 border-t border-line pt-4"
      >
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
          {{ submitting() ? 'Guardando…' : 'Guardar cambios' }}
        </button>
      </div>
    </form>
  `,
})
export class UserEditForm {
  readonly user = input.required<AdminUser>();
  readonly isSelf = input(false);
  readonly submitting = input(false);
  readonly error = input<string | null>(null);
  readonly save = output<UserEditResult>();
  readonly cancel = output<void>();

  private readonly fb = inject(NonNullableFormBuilder);
  private readonly companiesApi = inject(CompaniesApi);
  private readonly usersApi = inject(UsersApi);
  private readonly destroyRef = inject(DestroyRef);

  /**
   * La foto no viaja con el resto del formulario: la cuenta ya existe, así
   * que se sube al momento contra `POST /admin/users/:id/photo` y esta señal
   * refleja lo que devolvió el backend.
   */
  protected readonly photoUrl = signal<string | null>(null);
  protected readonly uploadingPhoto = signal(false);
  protected readonly photoError = signal<string | null>(null);

  protected readonly passwordHint = PASSWORD_POLICY_HINT;
  protected readonly showPassword = signal(false);
  protected readonly admin = Role.ADMIN;
  protected readonly candidate = Role.CANDIDATE;
  protected readonly employer = Role.EMPLOYER;
  protected readonly extraRoleIds = signal<string[]>([]);
  protected readonly today = new Date().toISOString().slice(0, 10);
  protected readonly companyOptions = signal<readonly IjOption[]>([]);
  protected readonly allCompanies = signal<
    readonly { id: string; businessName: string; rfc: string; state: string; municipality: string; taxRegime: string }[]
  >([]);
  /** Selección de partida, para saber si los roles cambiaron al guardar. */
  private readonly initialExtraRoleIds = signal<string[]>([]);

  /** Empresa seleccionada actualmente en el formulario. */
  protected readonly selectedCompany = computed(() => {
    const companyId = this.form.controls.companyId.value;
    return this.allCompanies().find((c) => c.id === companyId) ?? null;
  });

  protected readonly roleOptions: readonly IjOption[] = Object.values(Role).map(
    (role) => ({ value: role, label: ROLE_LABELS[role] }),
  );
  protected readonly statusOptions: readonly IjOption[] = Object.values(
    UserStatus,
  ).map((status) => ({ value: status, label: STATUS_LABELS[status] }));
  protected readonly companyRoleOptions: readonly IjOption[] = [
    { value: CompanyMemberRole.ADMIN, label: 'Administrador' },
    { value: CompanyMemberRole.OWNER, label: 'Propietario' },
    { value: CompanyMemberRole.RECRUITER, label: 'Reclutador' },
    { value: CompanyMemberRole.MEMBER, label: 'Miembro' },
  ];
  protected readonly documentTypeOptions: readonly IjOption[] =
    DOCUMENT_TYPES.map((d) => ({ value: d.value, label: d.label }));
  protected readonly stateOptions: readonly IjOption[] = MX_STATES.map((s) => ({
    value: s.code,
    label: s.name,
  }));

  protected readonly form = this.fb.group({
    // Cuenta
    email: this.fb.control('', [Validators.required, Validators.email]),
    role: this.fb.control<Role>(Role.CANDIDATE),
    status: this.fb.control<UserStatus>(UserStatus.ACTIVE),
    password: this.fb.control('', [passwordPolicyValidator]),
    emailVerified: this.fb.control(true),
    // Identidad (en `users`; para ADMIN es su único nombre)
    firstName: this.fb.control(''),
    lastName: this.fb.control(''),
    phone: this.fb.control(''),
    jobTitle: this.fb.control(''),
    // Perfil candidato
    cpFirstName: this.fb.control(''),
    cpLastName: this.fb.control(''),
    cpDocumentType: this.fb.control(''),
    cpDocumentNumber: this.fb.control(''),
    cpCurp: this.fb.control(''),
    cpBirthDate: this.fb.control(''),
    cpPhone: this.fb.control(''),
    cpProfessionalTitle: this.fb.control(''),
    cpState: this.fb.control(''),
    cpMunicipality: this.fb.control(''),
    // Perfil empresa
    companyId: this.fb.control(''),
    companyRole: this.fb.control<CompanyMemberRole>(CompanyMemberRole.ADMIN),
    // Notas
    adminNotes: this.fb.control(''),
  });

  constructor() {
    this.companiesApi
      .list({ page: 1, limit: 100 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        this.companyOptions.set(
          result.items.map((company) => ({
            value: company.id,
            label: `${company.businessName} · ${company.rfc}`,
          })),
        );
        this.allCompanies.set(
          result.items.map((company) => ({
            id: company.id,
            businessName: company.businessName,
            rfc: company.rfc,
            state: company.state,
            municipality: company.municipality,
            taxRegime: company.taxRegime,
          })),
        );
      });

    this.form.controls.role.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((role) => this.syncNameValidators(role));

    effect(() => {
      const user = this.user();
      const cp = user.candidateProfile;

      this.form.reset({
        email: user.email,
        role: user.role,
        status: user.status,
        password: '',
        emailVerified: user.emailVerified,
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        phone: user.phone ?? '',
        jobTitle: user.jobTitle ?? '',
        cpFirstName: cp?.firstName ?? '',
        cpLastName: cp?.lastName ?? '',
        cpDocumentType: cp?.documentType ?? '',
        cpDocumentNumber: cp?.documentNumber ?? '',
        cpCurp: cp?.curp ?? '',
        cpBirthDate: cp?.birthDate ?? '',
        cpPhone: cp?.phone ?? '',
        cpProfessionalTitle: cp?.professionalTitle ?? '',
        cpState: cp?.state ?? '',
        cpMunicipality: cp?.municipality ?? '',
        companyId: user.companyId ?? '',
        companyRole: (user.companyRole as CompanyMemberRole) ?? CompanyMemberRole.ADMIN,
        adminNotes: user.adminNotes ?? '',
      });

      this.photoUrl.set(user.photoUrl ?? null);
      this.photoError.set(null);
      this.syncNameValidators(user.role);

      const extra = (user.roles ?? [])
        .filter((role) => !role.isSystem)
        .map((role) => role.id);
      this.extraRoleIds.set(extra);
      this.initialExtraRoleIds.set(extra);

      // El propio administrador no puede degradarse ni desactivarse.
      const lock = this.isSelf();
      lock ? this.form.controls.role.disable() : this.form.controls.role.enable();
      lock
        ? this.form.controls.status.disable()
        : this.form.controls.status.enable();
    });
  }

  /**
   * El nombre sólo es obligatorio para ADMIN. Un empleador lo tiene como dato
   * opcional de contacto —su nombre para mostrar es el de la empresa— y un
   * candidato lo lleva en su propio perfil, no aquí.
   */
  private syncNameValidators(role: Role): void {
    for (const control of [
      this.form.controls.firstName,
      this.form.controls.lastName,
    ]) {
      if (role === Role.ADMIN) {
        control.addValidators(Validators.required);
      } else {
        control.removeValidators(Validators.required);
      }
      control.updateValueAndValidity({ emitEvent: false });
    }
  }

  protected invalid(name: string): boolean {
    const control = this.form.get(name) as AbstractControl;
    return control.invalid && (control.dirty || control.touched);
  }

  protected onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    // Se limpia siempre: si no, elegir el mismo archivo dos veces seguidas
    // no vuelve a disparar el `change`.
    input.value = '';
    if (!file) return;

    this.photoError.set(null);
    this.uploadingPhoto.set(true);
    this.usersApi
      .uploadPhoto(this.user().id, file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (url) => {
          this.photoUrl.set(url);
          this.uploadingPhoto.set(false);
        },
        error: () => {
          this.photoError.set(
            'No se pudo subir la imagen. Debe ser JPG, PNG o WebP de máximo 5 MB.',
          );
          this.uploadingPhoto.set(false);
        },
      });
  }

  protected removePhoto(): void {
    this.photoError.set(null);
    this.uploadingPhoto.set(true);
    this.usersApi
      .removePhoto(this.user().id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.photoUrl.set(null);
          this.uploadingPhoto.set(false);
        },
        error: () => {
          this.photoError.set('No se pudo quitar la foto.');
          this.uploadingPhoto.set(false);
        },
      });
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const user = this.user();
    const payload: UpdateUserPayload = {};

    // Cuenta
    if (value.email.trim().toLowerCase() !== user.email) {
      payload.email = value.email.trim().toLowerCase();
    }
    if (!this.isSelf() && value.role !== user.role) payload.role = value.role;
    if (!this.isSelf() && value.status !== user.status) {
      payload.status = value.status;
    }
    if (value.emailVerified !== user.emailVerified) {
      payload.emailVerified = value.emailVerified;
    }
    if (value.password) payload.password = value.password;

    // Identidad
    if (value.role !== Role.CANDIDATE) {
      if (value.firstName.trim() !== (user.firstName ?? '')) {
        payload.firstName = value.firstName.trim();
      }
      if (value.lastName.trim() !== (user.lastName ?? '')) {
        payload.lastName = value.lastName.trim();
      }
      if (value.phone.trim() !== (user.phone ?? '')) {
        payload.phone = value.phone.trim();
      }
      if (value.jobTitle.trim() !== (user.jobTitle ?? '')) {
        payload.jobTitle = value.jobTitle.trim();
      }
    }

    // Perfil candidato
    if (value.role === Role.CANDIDATE) {
      const cp = user.candidateProfile;
      const cpPayload: UpdateUserPayload['candidateProfile'] = {};

      if (value.cpFirstName.trim() !== (cp?.firstName ?? '')) {
        cpPayload.firstName = value.cpFirstName.trim();
      }
      if (value.cpLastName.trim() !== (cp?.lastName ?? '')) {
        cpPayload.lastName = value.cpLastName.trim();
      }
      if (value.cpDocumentType !== (cp?.documentType ?? '')) {
        cpPayload.documentType = value.cpDocumentType;
      }
      if (value.cpDocumentNumber.trim() !== (cp?.documentNumber ?? '')) {
        cpPayload.documentNumber = value.cpDocumentNumber.trim();
      }
      if (value.cpCurp.trim().toUpperCase() !== (cp?.curp ?? '')) {
        cpPayload.curp = value.cpCurp.trim().toUpperCase();
      }
      if (value.cpBirthDate !== (cp?.birthDate ?? '')) {
        cpPayload.birthDate = value.cpBirthDate;
      }
      if (value.cpPhone.trim() !== (cp?.phone ?? '')) {
        cpPayload.phone = value.cpPhone.trim();
      }
      if (value.cpProfessionalTitle.trim() !== (cp?.professionalTitle ?? '')) {
        cpPayload.professionalTitle = value.cpProfessionalTitle.trim();
      }
      if (value.cpState !== (cp?.state ?? '')) {
        cpPayload.state = value.cpState;
      }
      if (value.cpMunicipality.trim() !== (cp?.municipality ?? '')) {
        cpPayload.municipality = value.cpMunicipality.trim();
      }

      if (Object.keys(cpPayload).length > 0) {
        payload.candidateProfile = cpPayload;
      }
    }

    // Perfil empresa
    if (value.role === Role.EMPLOYER) {
      if (value.companyId !== (user.companyId ?? '')) {
        payload.companyId = value.companyId;
      }
      if (value.companyRole !== (user.companyRole ?? CompanyMemberRole.ADMIN)) {
        payload.companyRole = value.companyRole;
      }
    }

    // Notas internas
    if (value.adminNotes.trim() !== (user.adminNotes ?? '')) {
      payload.adminNotes = value.adminNotes.trim();
    }

    this.save.emit({
      changes: payload,
      extraRoleIds: this.rolesChanged() ? this.extraRoleIds() : null,
    });
  }

  private rolesChanged(): boolean {
    const before = this.initialExtraRoleIds();
    const now = this.extraRoleIds();
    return (
      before.length !== now.length || now.some((id) => !before.includes(id))
    );
  }
}
