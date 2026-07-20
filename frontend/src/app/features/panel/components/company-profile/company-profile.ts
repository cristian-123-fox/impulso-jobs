import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiErrorResponse } from '@/core/models/api-response.models';
import { CompanyProfileFacade } from '@/features/panel/data/company-profile.facade';
import {
  CompanyProfilePayload,
  COMPANY_TYPE_OPTIONS,
} from '@/features/panel/models/company-profile.models';
import {
  MX_STATES,
  SAT_CFDI_USES,
  SAT_TAX_REGIMES,
} from '@/shared/catalogs/mx.catalogs';
import {
  IjButton,
  IjIcon,
  IjInput,
  IjOption,
  IjSelect,
  IjTextarea,
} from '@/shared/ui';

const catalog = (items: readonly { code: string; name: string }[]): IjOption[] =>
  items.map((i) => ({ value: i.code, label: i.name }));

@Component({
  selector: 'app-company-profile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    IjButton,
    IjIcon,
    IjInput,
    IjSelect,
    IjTextarea,
  ],
  host: { class: 'block' },
  template: `
    @if (facade.loading() && !profile()) {
      <div class="rounded-3xl bg-white p-8 shadow-card">
        <div class="animate-pulse space-y-4">
          <div class="h-7 w-56 rounded bg-surface"></div>
          <div class="h-4 w-80 rounded bg-surface"></div>
          <div class="h-40 rounded-2xl bg-surface"></div>
        </div>
      </div>
    } @else if (facade.error() && !profile()) {
      <div class="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-card">
        <div class="flex items-start gap-3">
          <ij-icon name="alert-triangle" [size]="20" class="mt-0.5" />
          <div>
            <p class="font-semibold">{{ facade.error() }}</p>
            <button ij-button size="sm" shape="rounded" class="mt-4" (click)="reload()">
              Reintentar
            </button>
          </div>
        </div>
      </div>
    } @else if (profile(); as profile) {
      <form class="space-y-5" [formGroup]="form" (ngSubmit)="save()">
        <!-- Encabezado + logo -->
        <section class="rounded-[28px] bg-white p-6 shadow-card sm:p-7">
          <div class="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div class="flex items-center gap-4">
              <div
                class="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[22px] border border-line bg-surface text-2xl font-extrabold text-brand"
              >
                @if (profile.logoUrl) {
                  <img [src]="profile.logoUrl" [alt]="profile.businessName" class="h-full w-full object-cover" />
                } @else {
                  {{ initials() }}
                }
              </div>
              <div>
                <h2 class="text-2xl font-extrabold text-ink-900">{{ profile.businessName }}</h2>
                <p class="mt-1 text-[13px] text-muted">
                  {{ profile.legalName }}
                  @if (profile.companyRole) {
                    <span class="ml-1 rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-bold text-brand">
                      {{ profile.companyRole }}
                    </span>
                  }
                </p>
              </div>
            </div>

            <div class="flex w-full max-w-[420px] items-end gap-2">
              <ij-input class="flex-1" label="URL del logo" placeholder="https://..." [formControl]="logoControl" />
              <button ij-button type="button" shape="rounded" size="sm" class="mb-[2px]" [disabled]="savingLogo()" (click)="saveLogo()">
                {{ savingLogo() ? '...' : 'Guardar' }}
              </button>
            </div>
          </div>
        </section>

        <!-- Datos generales -->
        <section class="rounded-2xl bg-white p-6 shadow-card">
          <h3 class="mb-4 text-base font-bold text-ink-900">Datos generales</h3>
          <div class="grid gap-4 sm:grid-cols-2">
            <ij-input label="Nombre comercial" [required]="true" formControlName="businessName" />
            <ij-input label="Razón social" [required]="true" formControlName="legalName" />
            <ij-input label="Sector económico" formControlName="economicSector" />
            <ij-select label="Tipo de empresa" [options]="companyTypeOptions" formControlName="companyType" />
            <ij-input label="Número de empleados" type="number" [min]="1" formControlName="employeeCount" />
            <ij-input label="Año de fundación" type="number" [min]="1800" [max]="currentYear" formControlName="foundationYear" />
          </div>
        </section>

        <!-- Datos fiscales (CFDI) -->
        <section class="rounded-2xl border border-brand/20 bg-brand/5 p-6 shadow-card">
          <div class="mb-1 flex items-center gap-2">
            <ij-icon name="file" [size]="18" class="text-brand" />
            <h3 class="text-base font-bold text-ink-900">Datos fiscales (CFDI)</h3>
          </div>
          <p class="mb-4 text-[13px] text-muted">
            Estos datos alimentan la facturación. El RFC no puede modificarse tras el registro.
          </p>
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <span class="mb-1.5 block text-[13px] font-semibold text-ink-900">RFC (solo lectura)</span>
              <div class="flex h-[42px] items-center rounded-xl border border-line bg-surface px-3.5 text-[14px] font-semibold text-muted">
                {{ profile.rfc }}
              </div>
            </div>
            <ij-select label="Régimen fiscal" [required]="true" [options]="taxRegimeOptions" formControlName="taxRegime" />
            <ij-select label="Uso de CFDI" [options]="cfdiUseOptions" formControlName="cfdiUse" />
            <ij-input label="Código postal" [required]="true" inputmode="numeric" [maxLength]="5" formControlName="postalCode" />
          </div>
        </section>

        <!-- Contacto -->
        <section class="rounded-2xl bg-white p-6 shadow-card">
          <h3 class="mb-4 text-base font-bold text-ink-900">Contacto</h3>
          <div class="grid gap-4 sm:grid-cols-2">
            <ij-input label="Correo corporativo" type="email" formControlName="corporateEmail" />
            <ij-input label="Teléfono (+52)" type="tel" placeholder="33 1234 5678" formControlName="phoneNumber" />
            <div class="sm:col-span-2">
              <ij-input label="Sitio web" type="url" placeholder="https://empresa.com" formControlName="website" />
            </div>
          </div>
        </section>

        <!-- Ubicación -->
        <section class="rounded-2xl bg-white p-6 shadow-card">
          <h3 class="mb-4 text-base font-bold text-ink-900">Ubicación</h3>
          <div class="grid gap-4 sm:grid-cols-2">
            <ij-select label="Estado" [required]="true" [options]="stateOptions" formControlName="state" />
            <ij-input label="Municipio" [required]="true" formControlName="municipality" />
            <div class="sm:col-span-2">
              <ij-input label="Dirección" formControlName="address" />
            </div>
          </div>
        </section>

        <!-- Acerca de -->
        <section class="rounded-2xl bg-white p-6 shadow-card">
          <h3 class="mb-4 text-base font-bold text-ink-900">Acerca de la empresa</h3>
          <ij-textarea [rows]="5" [maxLength]="2000" placeholder="Describe tu empresa…" formControlName="companyDescription" />
        </section>

        @if (banner()) {
          <div class="rounded-xl px-4 py-3 text-sm" [class]="bannerTone() === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'">
            {{ banner() }}
          </div>
        }

        <div class="flex items-center justify-end gap-3">
          <button ij-button type="submit" shape="rounded" [disabled]="saving()">
            <ij-icon [name]="saving() ? 'clock' : 'check'" [size]="16" />
            {{ saving() ? 'Guardando...' : 'Guardar cambios' }}
          </button>
        </div>
      </form>
    }
  `,
})
export class CompanyProfileComponent {
  protected readonly facade = inject(CompanyProfileFacade);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly currentYear = new Date().getFullYear();
  protected readonly stateOptions = catalog(MX_STATES);
  protected readonly taxRegimeOptions = catalog(SAT_TAX_REGIMES);
  protected readonly cfdiUseOptions: IjOption[] = [
    { value: '', label: 'Sin especificar' },
    ...catalog(SAT_CFDI_USES),
  ];
  protected readonly companyTypeOptions: IjOption[] = [
    { value: '', label: 'Sin especificar' },
    ...COMPANY_TYPE_OPTIONS,
  ];

  protected readonly profile = this.facade.profile;
  protected readonly saving = signal(false);
  protected readonly savingLogo = signal(false);
  protected readonly banner = signal<string | null>(null);
  protected readonly bannerTone = signal<'success' | 'error'>('success');

  protected readonly logoControl = this.fb.control('');

  protected readonly form = this.fb.group({
    businessName: ['', [Validators.required, Validators.maxLength(160)]],
    legalName: ['', [Validators.required, Validators.maxLength(160)]],
    taxRegime: ['', [Validators.required]],
    cfdiUse: [''],
    postalCode: ['', [Validators.required, Validators.pattern(/^\d{5}$/)]],
    economicSector: ['', [Validators.maxLength(120)]],
    companyType: [''],
    corporateEmail: ['', [Validators.email, Validators.maxLength(255)]],
    phoneNumber: ['', [Validators.maxLength(20)]],
    website: ['', [Validators.maxLength(255)]],
    country: ['MX', [Validators.maxLength(60)]],
    state: ['', [Validators.required]],
    municipality: ['', [Validators.required, Validators.maxLength(120)]],
    address: ['', [Validators.maxLength(255)]],
    companyDescription: ['', [Validators.maxLength(2000)]],
    employeeCount: ['', [Validators.min(1)]],
    foundationYear: [
      '',
      [Validators.min(1800), Validators.max(this.currentYear)],
    ],
  });

  constructor() {
    this.reload();

    effect(() => {
      const profile = this.profile();
      if (!profile) return;
      this.form.patchValue({
        businessName: profile.businessName,
        legalName: profile.legalName,
        taxRegime: profile.taxRegime,
        cfdiUse: profile.cfdiUse ?? '',
        postalCode: profile.postalCode,
        economicSector: profile.economicSector ?? '',
        companyType: profile.companyType ?? '',
        corporateEmail: profile.corporateEmail ?? '',
        phoneNumber: profile.phoneNumber ?? '',
        website: profile.website ?? '',
        country: profile.country,
        state: profile.state,
        municipality: profile.municipality,
        address: profile.address ?? '',
        companyDescription: profile.companyDescription ?? '',
        employeeCount: profile.employeeCount?.toString() ?? '',
        foundationYear: profile.foundationYear?.toString() ?? '',
      });
      this.logoControl.setValue(profile.logoUrl ?? '');
    });
  }

  protected reload(): void {
    this.facade.load().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  protected initials(): string {
    const name = this.profile()?.businessName ?? 'IJ';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? '')
      .join('');
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.showError('Revisa los campos marcados antes de guardar.');
      return;
    }

    this.saving.set(true);
    this.banner.set(null);
    this.facade
      .save(this.buildPayload())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.showSuccess('Perfil de empresa actualizado correctamente.');
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.showError(this.messageOf(error));
        },
      });
  }

  protected saveLogo(): void {
    this.savingLogo.set(true);
    this.banner.set(null);
    this.facade
      .updateLogo({ logoUrl: this.logoControl.value.trim() || null })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.savingLogo.set(false);
          this.showSuccess('Logo actualizado.');
        },
        error: (error: unknown) => {
          this.savingLogo.set(false);
          this.showError(this.messageOf(error));
        },
      });
  }

  private buildPayload(): CompanyProfilePayload {
    const v = this.form.getRawValue();
    const orNull = (value: string): string | null => value.trim() || null;
    const toInt = (value: string): number | null => {
      const parsed = Number.parseInt(value, 10);
      return Number.isNaN(parsed) ? null : parsed;
    };
    return {
      businessName: v.businessName.trim(),
      legalName: v.legalName.trim(),
      taxRegime: v.taxRegime,
      cfdiUse: orNull(v.cfdiUse),
      postalCode: v.postalCode.trim(),
      economicSector: orNull(v.economicSector),
      companyType: orNull(v.companyType),
      corporateEmail: orNull(v.corporateEmail),
      phoneNumber: orNull(v.phoneNumber),
      website: orNull(v.website),
      country: orNull(v.country) ?? 'MX',
      state: v.state,
      municipality: v.municipality.trim(),
      address: orNull(v.address),
      companyDescription: orNull(v.companyDescription),
      employeeCount: toInt(v.employeeCount),
      foundationYear: toInt(v.foundationYear),
    };
  }

  private showSuccess(message: string): void {
    this.bannerTone.set('success');
    this.banner.set(message);
  }

  private showError(message: string): void {
    this.bannerTone.set('error');
    this.banner.set(message);
  }

  private messageOf(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as ApiErrorResponse | null;
      if (body && typeof body === 'object') {
        switch (body.errorCode) {
          case 'COMPANY_RFC_IMMUTABLE':
            return 'El RFC no puede modificarse tras el registro.';
          case 'COMPANY_INVALID_FOUNDATION_YEAR':
            return 'El año de fundación no puede ser mayor al año actual.';
          case 'COMPANY_INVALID_PHONE':
            return 'El teléfono debe tener 10 dígitos (con lada +52 opcional).';
          default:
            return body.message ?? 'No fue posible guardar el perfil.';
        }
      }
    }
    return 'No fue posible guardar el perfil.';
  }
}
