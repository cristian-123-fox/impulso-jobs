import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
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
import {
  COMPANY_TYPE_OPTIONS,
} from '@/features/company/profile/models/company-profile.models';
import { MX_STATES, SAT_TAX_REGIMES } from '@/shared/catalogs/mx.catalogs';
import { IjButton, IjIcon, IjInput, IjOption, IjSelect } from '@/shared/ui';
import {
  postalCodeValidator,
  rfcValidator,
} from '@/shared/validators/mx-identifiers.validator';
import {
  PASSWORD_POLICY_HINT,
  passwordPolicyValidator,
} from '@/shared/validators/password.validator';
import { CreateCompanyPayload } from '@/features/admin/companies/models/companies.models';

/**
 * Alta de empresa desde el back-office. Con "crear cuenta de acceso" marcado
 * se genera además el usuario OWNER (verificado y activo), que es lo que deja
 * la empresa lista para iniciar sesión y hacer pruebas.
 */
@Component({
  selector: 'app-company-create-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, IjButton, IjIcon, IjInput, IjSelect],
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
          label="Nombre comercial"
          placeholder="Northwind"
          [required]="true"
          [error]="invalid('businessName') ? 'El nombre comercial es obligatorio.' : null"
          formControlName="businessName"
        />
        <ij-input
          label="Razón social"
          placeholder="Northwind S.A. de C.V."
          [required]="true"
          [error]="invalid('legalName') ? 'La razón social es obligatoria.' : null"
          formControlName="legalName"
        />
        <ij-input
          label="RFC"
          placeholder="NOR900520AB1"
          [required]="true"
          [maxLength]="13"
          [error]="invalid('rfc') ? 'El RFC no tiene un formato válido.' : null"
          formControlName="rfc"
        />
        <ij-select
          label="Régimen fiscal"
          [required]="true"
          [options]="taxRegimeOptions"
          [error]="invalid('taxRegime') ? 'Selecciona el régimen fiscal.' : null"
          formControlName="taxRegime"
        />
        <ij-input
          label="Código postal"
          placeholder="45010"
          [required]="true"
          [maxLength]="5"
          [error]="invalid('postalCode') ? 'Debe tener 5 dígitos.' : null"
          formControlName="postalCode"
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
        <ij-select
          label="Tipo de empresa (opcional)"
          [options]="companyTypeOptions"
          [searchable]="false"
          formControlName="companyType"
        />
        <ij-input
          label="Sector económico (opcional)"
          placeholder="Tecnología"
          formControlName="economicSector"
        />
        <ij-input
          label="Correo corporativo (opcional)"
          type="email"
          placeholder="contacto@empresa.com"
          [error]="invalid('corporateEmail') ? 'Ingresa un correo válido.' : null"
          formControlName="corporateEmail"
        />
      </div>

      <div class="mt-5 rounded-xl border border-line bg-surface/60 p-4">
        <label class="flex items-center gap-2.5 text-[13.5px] font-semibold text-ink-900">
          <input
            type="checkbox"
            class="h-4 w-4 rounded border-line text-brand focus:ring-brand"
            [checked]="withOwner()"
            (change)="toggleOwner($event)"
          />
          Crear cuenta de acceso (usuario propietario)
        </label>

        @if (withOwner()) {
          <div class="mt-4 grid gap-4 sm:grid-cols-2">
            <ij-input
              label="Correo del usuario"
              type="email"
              placeholder="contacto@empresa.com"
              [required]="true"
              [error]="invalid('ownerEmail') ? 'Ingresa un correo válido.' : null"
              formControlName="ownerEmail"
            />
            <ij-input
              label="Contraseña"
              [type]="showPassword() ? 'text' : 'password'"
              placeholder="••••••••"
              [required]="true"
              [hint]="passwordHint"
              [error]="invalid('ownerPassword') ? passwordHint : null"
              formControlName="ownerPassword"
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
        }
      </div>

      <div
        class="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-line pt-4"
      >
        <p class="mr-auto text-[12.5px] text-muted">
          El RFC no podrá modificarse después del alta.
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
          {{ submitting() ? 'Creando…' : 'Crear empresa' }}
        </button>
      </div>
    </form>
  `,
})
export class CompanyCreateForm {
  readonly submitting = input(false);
  readonly error = input<string | null>(null);
  readonly create = output<CreateCompanyPayload>();
  readonly cancel = output<void>();

  private readonly fb = inject(NonNullableFormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly passwordHint = PASSWORD_POLICY_HINT;
  protected readonly showPassword = signal(false);
  protected readonly withOwner = signal(true);

  protected readonly taxRegimeOptions: readonly IjOption[] =
    SAT_TAX_REGIMES.map((r) => ({ value: r.code, label: r.name }));
  protected readonly stateOptions: readonly IjOption[] = MX_STATES.map((s) => ({
    value: s.code,
    label: s.name,
  }));
  protected readonly companyTypeOptions: readonly IjOption[] = [
    { value: '', label: 'Sin especificar' },
    ...COMPANY_TYPE_OPTIONS.map((t) => ({ value: t.value, label: t.label })),
  ];

  protected readonly form = this.fb.group({
    businessName: this.fb.control('', [Validators.required]),
    legalName: this.fb.control('', [Validators.required]),
    rfc: this.fb.control('', [Validators.required, rfcValidator]),
    taxRegime: this.fb.control('601', [Validators.required]),
    postalCode: this.fb.control('', [Validators.required, postalCodeValidator]),
    state: this.fb.control('', [Validators.required]),
    municipality: this.fb.control('', [Validators.required]),
    companyType: this.fb.control(''),
    economicSector: this.fb.control(''),
    corporateEmail: this.fb.control('', [Validators.email]),
    ownerEmail: this.fb.control('', [Validators.required, Validators.email]),
    ownerPassword: this.fb.control('', [
      Validators.required,
      passwordPolicyValidator,
    ]),
  });

  constructor() {
    // El RFC se almacena en mayúsculas; se normaliza mientras se escribe.
    this.form.controls.rfc.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        const upper = value.toUpperCase();
        if (upper !== value) {
          this.form.controls.rfc.setValue(upper, { emitEvent: false });
        }
      });
  }

  protected toggleOwner(event: Event): void {
    const enabled = (event.target as HTMLInputElement).checked;
    this.withOwner.set(enabled);

    const { ownerEmail, ownerPassword } = this.form.controls;
    if (enabled) {
      ownerEmail.setValidators([Validators.required, Validators.email]);
      ownerPassword.setValidators([Validators.required, passwordPolicyValidator]);
    } else {
      ownerEmail.clearValidators();
      ownerPassword.clearValidators();
    }
    ownerEmail.updateValueAndValidity();
    ownerPassword.updateValueAndValidity();
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
    const payload: CreateCompanyPayload = {
      businessName: value.businessName.trim(),
      legalName: value.legalName.trim(),
      rfc: value.rfc.trim().toUpperCase(),
      taxRegime: value.taxRegime,
      postalCode: value.postalCode.trim(),
      state: value.state,
      municipality: value.municipality.trim(),
    };

    if (value.companyType) payload.companyType = value.companyType;
    if (value.economicSector.trim()) {
      payload.economicSector = value.economicSector.trim();
    }
    if (value.corporateEmail.trim()) {
      payload.corporateEmail = value.corporateEmail.trim().toLowerCase();
    }
    if (this.withOwner()) {
      payload.owner = {
        email: value.ownerEmail.trim().toLowerCase(),
        password: value.ownerPassword,
      };
    }

    this.create.emit(payload);
  }
}
