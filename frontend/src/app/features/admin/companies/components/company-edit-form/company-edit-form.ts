import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  input,
  output,
} from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { COMPANY_TYPE_OPTIONS } from '@/features/company/profile/models/company-profile.models';
import { MX_STATES, SAT_TAX_REGIMES } from '@/shared/catalogs/mx.catalogs';
import { IjButton, IjInput, IjOption, IjSelect } from '@/shared/ui';
import { postalCodeValidator } from '@/shared/validators/mx-identifiers.validator';
import {
  AdminCompany,
  UpdateCompanyPayload,
} from '@/features/admin/companies/models/companies.models';

/**
 * Edición de la ficha de la empresa desde el back-office. El **RFC** se muestra
 * pero no se edita: identifica fiscalmente a la empresa y el backend lo rechaza.
 * La cuenta dueña se gestiona desde el equipo, no aquí.
 */
@Component({
  selector: 'app-company-edit-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, IjButton, IjInput, IjSelect],
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
        <ij-input label="RFC" hint="No se puede modificar." formControlName="rfc" />
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
        <ij-input
          label="Teléfono (opcional)"
          placeholder="3312345678"
          [maxLength]="20"
          formControlName="phoneNumber"
        />
        <ij-input
          label="Sitio web (opcional)"
          placeholder="https://empresa.com"
          formControlName="website"
        />
      </div>

      <div class="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-line pt-4">
        <p class="mr-auto text-[12.5px] text-muted">
          Los cambios se ven de inmediato en el portal.
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
          {{ submitting() ? 'Guardando…' : 'Guardar cambios' }}
        </button>
      </div>
    </form>
  `,
})
export class CompanyEditForm implements OnInit {
  readonly company = input.required<AdminCompany>();
  readonly submitting = input(false);
  readonly error = input<string | null>(null);
  readonly save = output<UpdateCompanyPayload>();
  readonly cancel = output<void>();

  private readonly fb = inject(NonNullableFormBuilder);

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
    rfc: this.fb.control({ value: '', disabled: true }),
    taxRegime: this.fb.control('601', [Validators.required]),
    postalCode: this.fb.control('', [Validators.required, postalCodeValidator]),
    state: this.fb.control('', [Validators.required]),
    municipality: this.fb.control('', [Validators.required]),
    companyType: this.fb.control(''),
    economicSector: this.fb.control(''),
    corporateEmail: this.fb.control('', [Validators.email]),
    phoneNumber: this.fb.control(''),
    website: this.fb.control(''),
  });

  ngOnInit(): void {
    const company = this.company();
    this.form.setValue({
      businessName: company.businessName,
      legalName: company.legalName,
      rfc: company.rfc,
      taxRegime: company.taxRegime,
      postalCode: company.postalCode,
      state: company.state,
      municipality: company.municipality,
      companyType: company.companyType ?? '',
      economicSector: company.economicSector ?? '',
      corporateEmail: company.corporateEmail ?? '',
      phoneNumber: company.phoneNumber ?? '',
      website: company.website ?? '',
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
    const payload: UpdateCompanyPayload = {
      businessName: value.businessName.trim(),
      legalName: value.legalName.trim(),
      taxRegime: value.taxRegime,
      postalCode: value.postalCode.trim(),
      state: value.state,
      municipality: value.municipality.trim(),
    };

    // Los opcionales sólo viajan con contenido: el backend los valida en cuanto
    // están presentes y una cadena vacía no pasaría `@IsEmail`/`@IsUrl`.
    if (value.companyType) payload.companyType = value.companyType;
    if (value.economicSector.trim()) {
      payload.economicSector = value.economicSector.trim();
    }
    if (value.corporateEmail.trim()) {
      payload.corporateEmail = value.corporateEmail.trim().toLowerCase();
    }
    if (value.phoneNumber.trim()) payload.phoneNumber = value.phoneNumber.trim();
    if (value.website.trim()) payload.website = value.website.trim();

    this.save.emit(payload);
  }
}
