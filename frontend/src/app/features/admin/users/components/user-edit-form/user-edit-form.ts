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
  private readonly destroyRef = inject(DestroyRef);

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

    effect(() => {
      const user = this.user();
      const cp = user.candidateProfile;

      this.form.reset({
        email: user.email,
        role: user.role,
        status: user.status,
        password: '',
        emailVerified: user.emailVerified,
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

  protected invalid(name: string): boolean {
    const control = this.form.get(name) as AbstractControl;
    return control.invalid && (control.dirty || control.touched);
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
