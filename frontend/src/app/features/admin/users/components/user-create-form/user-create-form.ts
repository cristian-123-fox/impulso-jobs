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
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
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
  IjPasswordStrength,
  IjSelect,
} from '@/shared/ui';
import { notFutureDateValidator } from '@/shared/validators/mx-identifiers.validator';
import { passwordPolicyValidator } from '@/shared/validators/password.validator';
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
 * Nombre corto de cada campo para el resumen del pie. La lista de lo que falta
 * se saca de la validez de los controles, no de una comprobación aparte, así
 * que sigue a `syncRoleValidators` sin tener que repetir sus reglas.
 */
const FIELD_LABELS: Readonly<Record<string, string>> = {
  email: 'correo',
  password: 'contraseña segura',
  companyId: 'empresa',
  firstName: 'nombre',
  lastName: 'apellidos',
  documentType: 'tipo de documento',
  documentNumber: 'número de documento',
  birthDate: 'fecha de nacimiento',
  state: 'estado',
  municipality: 'municipio',
};

/**
 * Descripción de cada rol interno. Se corresponde con lo que el backend hace
 * distinto: gestionar el equipo y recibir los avisos del plan es cosa de
 * OWNER/ADMIN (`company-members.use-case.ts`), y toda empresa conserva al
 * menos un OWNER.
 */
const COMPANY_ROLE_CARDS: readonly {
  value: CompanyMemberRole;
  label: string;
  description: string;
}[] = [
  {
    value: CompanyMemberRole.OWNER,
    label: 'Propietario',
    description: 'Manda en la empresa y recibe los avisos del plan.',
  },
  {
    value: CompanyMemberRole.ADMIN,
    label: 'Administrador',
    description: 'Gestiona el equipo y recibe los avisos del plan.',
  },
  {
    value: CompanyMemberRole.RECRUITER,
    label: 'Reclutador',
    description: 'Trabaja con vacantes y postulaciones.',
  },
  {
    value: CompanyMemberRole.MEMBER,
    label: 'Miembro',
    description: 'Acceso básico, sin gestión del equipo.',
  },
];

/**
 * Alta de usuario desde el back-office. El bloque de datos adicionales depende
 * del rol: el empleador se vincula a una empresa existente y el aspirante
 * necesita su perfil mínimo (el backend exige ambos).
 *
 * Se agrupa en secciones con su propio encabezado a la izquierda —acceso,
 * empresa, identidad— porque los campos cambian con el rol: en una rejilla
 * plana, elegir «aspirante» hacía aparecer siete campos sin decir de qué eran.
 */
@Component({
  selector: 'app-user-create-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    ExtraRolesPicker,
    IjPasswordStrength,
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
          class="mb-5 rounded-lg bg-red-50 px-3 py-2 text-[13px] font-medium text-red-700"
        >
          {{ error() }}
        </p>
      }

      <div class="flex flex-col gap-7">
        <section class="grid gap-4 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-5">
          <div>
            <h3 class="text-[13px] font-extrabold text-ink-900">Acceso</h3>
            <p class="mt-1 text-[12.5px] leading-snug text-muted">
              Credenciales con las que entrará a la plataforma.
            </p>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <ij-input
              label="Correo electrónico"
              type="email"
              placeholder="persona@empresa.com"
              [required]="true"
              [error]="invalid('email') ? 'Ingresa un correo válido.' : null"
              formControlName="email"
            />
            <div class="flex flex-col gap-2.5">
              <ij-input
                label="Contraseña"
                [type]="showPassword() ? 'text' : 'password'"
                placeholder="Mínimo 8 caracteres"
                [required]="true"
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
              <ij-password-strength [value]="password()" />
            </div>
            <ij-select
              class="sm:col-span-2"
              label="Rol de plataforma"
              [required]="true"
              [options]="roleOptions"
              [searchable]="false"
              formControlName="role"
            />
          </div>
        </section>

        @if (form.controls.role.value === employer) {
          <section class="grid gap-4 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-5">
            <div>
              <h3 class="text-[13px] font-extrabold text-ink-900">Empresa y permisos</h3>
              <p class="mt-1 text-[12.5px] leading-snug text-muted">
                A qué empresa pertenece y qué puede hacer dentro de ella.
              </p>
            </div>
            <div class="flex flex-col gap-4">
              <ij-select
                label="Empresa"
                [required]="true"
                [options]="companyOptions()"
                [error]="invalid('companyId') ? 'Selecciona la empresa.' : null"
                [hint]="companyOptions().length ? '' : 'Aún no hay empresas: crea una primero.'"
                formControlName="companyId"
              />

              @if (selectedCompany(); as company) {
                <div class="rounded-lg border border-line bg-surface/60 p-3">
                  <p class="text-[12px] font-bold text-body">{{ company.businessName }}</p>
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

              <fieldset class="flex flex-col gap-2">
                <legend class="mb-0.5 text-[13px] font-bold text-ink-900">
                  Rol dentro de la empresa
                </legend>
                <div class="grid gap-2 sm:grid-cols-2">
                  @for (card of companyRoleCards; track card.value) {
                    <label [class]="roleCardClass(card.value)">
                      <input
                        type="radio"
                        class="sr-only"
                        [value]="card.value"
                        formControlName="companyRole"
                      />
                      <span class="flex items-center justify-between gap-2">
                        <span class="text-[13.5px] font-bold text-ink-900">{{ card.label }}</span>
                        <span [class]="roleDotClass(card.value)">
                          <span class="h-1.5 w-1.5 rounded-full bg-white"></span>
                        </span>
                      </span>
                      <span class="text-[11.5px] leading-snug text-muted">
                        {{ card.description }}
                      </span>
                    </label>
                  }
                </div>
              </fieldset>
            </div>
          </section>
        }

        <section class="grid gap-4 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-5">
          <div>
            <h3 class="text-[13px] font-extrabold text-ink-900">
              {{ form.controls.role.value === candidate ? 'Datos del aspirante' : 'Datos personales' }}
            </h3>
            <p class="mt-1 text-[12.5px] leading-snug text-muted">
              {{ identityHint() }}
            </p>
          </div>

          @if (form.controls.role.value !== candidate) {
            <div class="grid gap-4 sm:grid-cols-2">
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
              <ij-input label="Teléfono" placeholder="3312345678" formControlName="phone" />
              <ij-input
                label="Puesto o cargo"
                placeholder="Coordinador de soporte"
                formControlName="jobTitle"
              />
            </div>
          } @else {
            <div class="grid gap-4 sm:grid-cols-2">
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
              <ij-input label="Teléfono" placeholder="3312345678" formControlName="phone" />
            </div>
          }
        </section>

        @if (form.controls.role.value === admin) {
          <section class="grid gap-4 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-5">
            <div>
              <h3 class="text-[13px] font-extrabold text-ink-900">Roles adicionales</h3>
              <p class="mt-1 text-[12.5px] leading-snug text-muted">
                Permisos sobre el rol base de administrador.
              </p>
            </div>
            <app-extra-roles-picker [(selected)]="extraRoleIds" />
          </section>
        }
      </div>

      <!--
        Pegado al fondo del cuerpo desplazable del modal (ij-modal en modo
        scrollable): en un formulario de tres secciones, el botón de guardar no
        puede quedar a un scroll de distancia.
      -->
      <div
        class="sticky bottom-0 -mx-5 -mb-5 mt-7 flex flex-wrap items-center gap-3 border-t border-line bg-white/95 px-5 py-3.5 backdrop-blur-sm sm:-mx-6 sm:px-6"
      >
        <p
          class="mr-auto flex min-w-0 items-center gap-2 text-[12.5px] font-semibold"
          [class]="missing().length ? 'text-muted' : 'text-accent-green-strong'"
        >
          <span
            class="h-2 w-2 flex-none rounded-full"
            [class]="missing().length ? 'bg-line' : 'bg-accent-green'"
          ></span>
          <span class="truncate">{{ summary() }}</span>
        </p>
        <button
          type="button"
          class="rounded-xl border border-line bg-white px-4 py-2.5 text-[13.5px] font-bold text-body transition-colors hover:bg-surface active:translate-y-px"
          (click)="cancel.emit()"
        >
          Cancelar
        </button>
        <button
          ij-button
          type="submit"
          variant="primary"
          shape="rounded"
          size="sm"
          [disabled]="submitting()"
        >
          <ij-icon name="check" [size]="16" [strokeWidth]="2.5" />
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
  protected readonly today = new Date().toISOString().slice(0, 10);
  protected readonly showPassword = signal(false);
  protected readonly companyRoleCards = COMPANY_ROLE_CARDS;
  protected readonly companyOptions = signal<readonly IjOption[]>([]);
  protected readonly allCompanies = signal<
    readonly { id: string; businessName: string; rfc: string; state: string; municipality: string; taxRegime: string }[]
  >([]);

  protected readonly roleOptions: readonly IjOption[] = Object.values(Role).map(
    (role) => ({ value: role, label: ROLE_LABELS[role] }),
  );
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

  /**
   * Latido del formulario: `valueChanges` no distingue qué cambió, pero sirve
   * como dependencia para que los `computed` de abajo vuelvan a leer el estado
   * de los controles (que no son señales).
   */
  private readonly tick = toSignal(this.form.valueChanges, {
    initialValue: null,
  });

  protected readonly password = computed(() => {
    this.tick();
    return this.form.controls.password.value;
  });

  /** Empresa seleccionada actualmente en el formulario. */
  protected readonly selectedCompany = computed(() => {
    this.tick();
    const companyId = this.form.controls.companyId.value;
    return this.allCompanies().find((c) => c.id === companyId) ?? null;
  });

  /** Campos obligatorios aún sin rellenar, en el orden del formulario. */
  protected readonly missing = computed<readonly string[]>(() => {
    this.tick();
    return Object.keys(FIELD_LABELS)
      .filter((name) => this.form.get(name)?.invalid)
      .map((name) => FIELD_LABELS[name]);
  });

  protected readonly summary = computed(() => {
    const gaps = this.missing();
    if (gaps.length > 0) return `Falta: ${gaps.join(', ')}.`;
    const role = ROLE_LABELS[this.form.controls.role.value].toLowerCase();
    return `Se creará como ${role}, verificada y activa.`;
  });

  protected readonly identityHint = computed(() => {
    this.tick();
    switch (this.form.controls.role.value) {
      case Role.ADMIN:
        return 'Obligatorios: una cuenta administrativa no tiene otro nombre.';
      case Role.CANDIDATE:
        return 'El backend exige el perfil mínimo para dar de alta a un aspirante.';
      default:
        return 'Opcional. El usuario podrá completarlos después.';
    }
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

  protected roleCardClass(value: CompanyMemberRole): string {
    const base =
      'flex cursor-pointer flex-col gap-1 rounded-xl border p-3 transition-colors ' +
      'focus-within:ring-2 focus-within:ring-brand-700/40';
    return this.form.controls.companyRole.value === value
      ? `${base} border-brand bg-brand-50`
      : `${base} border-line bg-white hover:border-brand/40`;
  }

  protected roleDotClass(value: CompanyMemberRole): string {
    const base = 'flex h-4 w-4 flex-none items-center justify-center rounded-full border';
    return this.form.controls.companyRole.value === value
      ? `${base} border-brand bg-brand`
      : `${base} border-line bg-white`;
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
