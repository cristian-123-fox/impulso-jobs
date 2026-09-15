import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  OnInit,
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
  CompanyMemberRole,
  CreateUserPayload,
  ROLE_LABELS,
} from '@/features/admin/users/models/users.models';

/** Controles obligatorios según el rol elegido. */
const CANDIDATE_CONTROLS = [
  'firstName',
  'lastName',
  'documentType',
  'documentNumber',
  'birthDate',
  'state',
  'municipality',
] as const;

/**
 * Alta de usuario desde el back-office. El bloque de datos adicionales depende
 * del rol: el empleador se vincula a una empresa existente y el aspirante
 * necesita su perfil mínimo (el backend exige ambos).
 */
@Component({
  selector: 'app-user-create-form',
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

      <div class="grid gap-4 sm:grid-cols-2">
        <ij-input
          label="Correo electrónico"
          type="email"
          placeholder="persona@empresa.com"
          [required]="true"
          [error]="invalid('email') ? 'Ingresa un correo válido.' : null"
          formControlName="email"
        />
        <ij-input
          label="Contraseña"
          [type]="showPassword() ? 'text' : 'password'"
          placeholder="••••••••"
          [required]="true"
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
        <ij-select
          label="Rol de plataforma"
          [required]="true"
          [options]="roleOptions"
          [searchable]="false"
          formControlName="role"
        />

        @if (form.controls.role.value === employer) {
          <ij-select
            label="Empresa"
            [required]="true"
            [options]="companyOptions()"
            [error]="invalid('companyId') ? 'Selecciona la empresa.' : null"
            [hint]="companyOptions().length ? '' : 'Aún no hay empresas: crea una primero.'"
            formControlName="companyId"
          />
          <ij-select
            label="Rol dentro de la empresa"
            [options]="companyRoleOptions"
            [searchable]="false"
            formControlName="companyRole"
          />
          @if (selectedCompany(); as company) {
            <div class="sm:col-span-2 rounded-lg border border-line bg-surface/50 p-3">
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

        @if (form.controls.role.value !== candidate) {
          <ij-input
            label="Nombre(s)"
            placeholder="Oscar"
            [required]="form.controls.role.value === admin"
            [error]="invalid('firstName') ? 'El nombre es obligatorio.' : null"
            formControlName="firstName"
          />
          <ij-input
            label="Apellidos"
            placeholder="Ruiz"
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
        }

        @if (form.controls.role.value === candidate) {
          <ij-input
            label="Nombre(s)"
            placeholder="Ana"
            [required]="true"
            [error]="invalid('firstName') ? 'El nombre es obligatorio.' : null"
            formControlName="firstName"
          />
          <ij-input
            label="Apellidos"
            placeholder="García"
            [required]="true"
            [error]="invalid('lastName') ? 'El apellido es obligatorio.' : null"
            formControlName="lastName"
          />
          <ij-select
            label="Tipo de documento"
            [required]="true"
            [options]="documentTypeOptions"
            [error]="invalid('documentType') ? 'Selecciona el tipo.' : null"
            formControlName="documentType"
          />
          <ij-input
            label="Número de documento"
            placeholder="Número"
            [required]="true"
            [error]="invalid('documentNumber') ? 'El documento es obligatorio.' : null"
            formControlName="documentNumber"
          />
          <ij-datepicker
            label="Fecha de nacimiento"
            [required]="true"
            [max]="today"
            [error]="invalid('birthDate') ? 'Ingresa una fecha válida (no futura).' : null"
            formControlName="birthDate"
          />
          <ij-select
            label="Estado"
            [required]="true"
            [options]="stateOptions"
            [error]="invalid('state') ? 'Selecciona el estado.' : null"
            formControlName="state"
          />
          <ij-input
            label="Municipio"
            placeholder="Zapopan"
            [required]="true"
            [error]="invalid('municipality') ? 'El municipio es obligatorio.' : null"
            formControlName="municipality"
          />
          <ij-input
            label="Teléfono"
            placeholder="3312345678"
            formControlName="phone"
          />
        }
      </div>

      @if (form.controls.role.value === admin) {
        <app-extra-roles-picker class="mt-5" [(selected)]="extraRoleIds" />
      }

      <div
        class="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-line pt-4"
      >
        <p class="mr-auto text-[12.5px] text-muted">
          La cuenta se crea verificada y activa.
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
          {{ submitting() ? 'Creando…' : 'Crear usuario' }}
        </button>
      </div>
    </form>
  `,
})
export class UserCreateForm implements OnInit {
  /** Rol preseleccionado: el de la pestaña activa del listado. */
  readonly initialRole = input<Role>(Role.CANDIDATE);
  readonly submitting = input(false);
  readonly error = input<string | null>(null);
  readonly create = output<CreateUserPayload>();
  readonly cancel = output<void>();

  private readonly fb = inject(NonNullableFormBuilder);
  private readonly companiesApi = inject(CompaniesApi);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly employer = Role.EMPLOYER;
  protected readonly candidate = Role.CANDIDATE;
  protected readonly admin = Role.ADMIN;
  /** Roles personalizados a asignar además del base (sólo personal admin). */
  protected readonly extraRoleIds = signal<string[]>([]);
  protected readonly passwordHint = PASSWORD_POLICY_HINT;
  protected readonly today = new Date().toISOString().slice(0, 10);
  protected readonly showPassword = signal(false);
  protected readonly companyOptions = signal<readonly IjOption[]>([]);
  protected readonly allCompanies = signal<
    readonly { id: string; businessName: string; rfc: string; state: string; municipality: string; taxRegime: string }[]
  >([]);

  /** Empresa seleccionada actualmente en el formulario. */
  protected readonly selectedCompany = computed(() => {
    const companyId = this.form.controls.companyId.value;
    return this.allCompanies().find((c) => c.id === companyId) ?? null;
  });

  protected readonly roleOptions: readonly IjOption[] = Object.values(Role).map(
    (role) => ({ value: role, label: ROLE_LABELS[role] }),
  );
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
    email: this.fb.control('', [Validators.required, Validators.email]),
    password: this.fb.control('', [
      Validators.required,
      passwordPolicyValidator,
    ]),
    role: this.fb.control<Role>(Role.CANDIDATE, [Validators.required]),
    companyId: this.fb.control(''),
    companyRole: this.fb.control<CompanyMemberRole>(CompanyMemberRole.ADMIN),
    firstName: this.fb.control(''),
    lastName: this.fb.control(''),
    documentType: this.fb.control(''),
    documentNumber: this.fb.control(''),
    birthDate: this.fb.control(''),
    state: this.fb.control(''),
    municipality: this.fb.control(''),
    phone: this.fb.control(''),
    jobTitle: this.fb.control(''),
  });

  /** Los inputs aún no están asignados en el constructor: se lee aquí. */
  ngOnInit(): void {
    this.form.controls.role.setValue(this.initialRole());
  }

  constructor() {
    this.syncRoleValidators(this.form.controls.role.value);
    this.form.controls.role.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((role) => this.syncRoleValidators(role));

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
  }

  /** Activa/desactiva los validadores del bloque que corresponde al rol. */
  private syncRoleValidators(role: Role): void {
    const companyId = this.form.controls.companyId;
    companyId.setValidators(role === Role.EMPLOYER ? [Validators.required] : []);
    companyId.updateValueAndValidity({ emitEvent: false });

    for (const name of CANDIDATE_CONTROLS) {
      const control = this.form.controls[name];
      control.setValidators(role === Role.CANDIDATE ? [Validators.required] : []);
      if (name === 'birthDate' && role === Role.CANDIDATE) {
        control.addValidators(notFutureDateValidator);
      }
      control.updateValueAndValidity({ emitEvent: false });
    }

    // El nombre también es obligatorio para ADMIN. El bucle de arriba se los
    // acaba de limpiar porque están en CANDIDATE_CONTROLS, así que se vuelven
    // a poner aquí; para EMPLOYER quedan opcionales.
    if (role === Role.ADMIN) {
      for (const control of [
        this.form.controls.firstName,
        this.form.controls.lastName,
      ]) {
        control.addValidators(Validators.required);
        control.updateValueAndValidity({ emitEvent: false });
      }
    }
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
    const payload: CreateUserPayload = {
      email: value.email.trim().toLowerCase(),
      password: value.password,
      role: value.role,
    };

    if (value.role === Role.EMPLOYER) {
      payload.companyId = value.companyId;
      payload.companyRole = value.companyRole;
    }

    // Identidad. Un candidato la lleva dentro de `candidate` (el backend la
    // copia a `users` al crearla); el resto la manda en la raíz, que es su
    // único sitio.
    if (value.role !== Role.CANDIDATE) {
      payload.firstName = value.firstName.trim() || undefined;
      payload.lastName = value.lastName.trim() || undefined;
      payload.phone = value.phone.trim() || undefined;
      payload.jobTitle = value.jobTitle.trim() || undefined;
    }

    if (value.role === Role.ADMIN && this.extraRoleIds().length) {
      payload.extraRoleIds = this.extraRoleIds();
    }

    if (value.role === Role.CANDIDATE) {
      payload.candidate = {
        firstName: value.firstName.trim(),
        lastName: value.lastName.trim(),
        documentType: value.documentType,
        documentNumber: value.documentNumber.trim(),
        birthDate: value.birthDate,
        state: value.state,
        municipality: value.municipality.trim(),
        phone: value.phone.trim() || undefined,
      };
    }

    this.create.emit(payload);
  }
}
