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
import { IjButton, IjIcon } from '@/shared/ui';

const INPUT =
  'w-full rounded-xl border border-line bg-white px-4 py-3 text-[14px] text-ink-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15';
const READONLY_INPUT =
  'w-full rounded-xl border border-line bg-surface px-4 py-3 text-[14px] font-semibold text-muted outline-none';
const LABEL = 'mb-2 block text-sm font-semibold text-ink-900';
const ERROR = 'mt-1 text-[12px] font-medium text-red-600';

@Component({
  selector: 'app-company-profile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, IjButton, IjIcon],
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

            <div class="w-full max-w-[380px]">
              <label [class]="labelClass" for="logoUrl">URL del logo</label>
              <div class="flex gap-2">
                <input id="logoUrl" [class]="inputClass" [value]="logoDraft()" (input)="onLogoInput($event)" placeholder="https://..." />
                <button ij-button type="button" shape="rounded" size="sm" [disabled]="savingLogo()" (click)="saveLogo()">
                  {{ savingLogo() ? '...' : 'Guardar' }}
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- Datos generales -->
        <section class="rounded-2xl bg-white p-6 shadow-card">
          <h3 class="mb-4 text-base font-bold text-ink-900">Datos generales</h3>
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label [class]="labelClass" for="businessName">Nombre comercial *</label>
              <input id="businessName" [class]="inputClass" formControlName="businessName" />
              @if (invalid('businessName')) {
                <p [class]="errorClass">El nombre comercial es obligatorio.</p>
              }
            </div>
            <div>
              <label [class]="labelClass" for="legalName">Razón social *</label>
              <input id="legalName" [class]="inputClass" formControlName="legalName" />
              @if (invalid('legalName')) {
                <p [class]="errorClass">La razón social es obligatoria.</p>
              }
            </div>
            <div>
              <label [class]="labelClass" for="economicSector">Sector económico</label>
              <input id="economicSector" [class]="inputClass" formControlName="economicSector" />
            </div>
            <div>
              <label [class]="labelClass" for="companyType">Tipo de empresa</label>
              <select id="companyType" [class]="inputClass" formControlName="companyType">
                <option value="">Sin especificar</option>
                @for (opt of companyTypes; track opt.value) {
                  <option [value]="opt.value">{{ opt.label }}</option>
                }
              </select>
            </div>
            <div>
              <label [class]="labelClass" for="employeeCount">Número de empleados</label>
              <input id="employeeCount" type="number" min="1" [class]="inputClass" formControlName="employeeCount" />
            </div>
            <div>
              <label [class]="labelClass" for="foundationYear">Año de fundación</label>
              <input id="foundationYear" type="number" min="1800" [max]="currentYear" [class]="inputClass" formControlName="foundationYear" />
              @if (invalid('foundationYear')) {
                <p [class]="errorClass">El año no puede ser mayor a {{ currentYear }}.</p>
              }
            </div>
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
              <label [class]="labelClass" for="rfc">RFC (solo lectura)</label>
              <input id="rfc" [class]="readonlyClass" [value]="profile.rfc" readonly disabled />
            </div>
            <div>
              <label [class]="labelClass" for="taxRegime">Régimen fiscal *</label>
              <select id="taxRegime" [class]="inputClass" formControlName="taxRegime">
                <option value="" disabled>Selecciona…</option>
                @for (opt of taxRegimes; track opt.code) {
                  <option [value]="opt.code">{{ opt.name }}</option>
                }
              </select>
              @if (invalid('taxRegime')) {
                <p [class]="errorClass">Selecciona un régimen fiscal.</p>
              }
            </div>
            <div>
              <label [class]="labelClass" for="cfdiUse">Uso de CFDI</label>
              <select id="cfdiUse" [class]="inputClass" formControlName="cfdiUse">
                <option value="">Sin especificar</option>
                @for (opt of cfdiUses; track opt.code) {
                  <option [value]="opt.code">{{ opt.name }}</option>
                }
              </select>
            </div>
            <div>
              <label [class]="labelClass" for="postalCode">Código postal *</label>
              <input id="postalCode" [class]="inputClass" formControlName="postalCode" maxlength="5" inputmode="numeric" />
              @if (invalid('postalCode')) {
                <p [class]="errorClass">El C.P. debe tener 5 dígitos.</p>
              }
            </div>
          </div>
        </section>

        <!-- Contacto -->
        <section class="rounded-2xl bg-white p-6 shadow-card">
          <h3 class="mb-4 text-base font-bold text-ink-900">Contacto</h3>
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label [class]="labelClass" for="corporateEmail">Correo corporativo</label>
              <input id="corporateEmail" type="email" [class]="inputClass" formControlName="corporateEmail" />
              @if (invalid('corporateEmail')) {
                <p [class]="errorClass">Correo no válido.</p>
              }
            </div>
            <div>
              <label [class]="labelClass" for="phoneNumber">Teléfono (+52)</label>
              <input id="phoneNumber" [class]="inputClass" formControlName="phoneNumber" placeholder="33 1234 5678" />
            </div>
            <div class="sm:col-span-2">
              <label [class]="labelClass" for="website">Sitio web</label>
              <input id="website" [class]="inputClass" formControlName="website" placeholder="https://empresa.com" />
              @if (invalid('website')) {
                <p [class]="errorClass">URL no válida.</p>
              }
            </div>
          </div>
        </section>

        <!-- Ubicación -->
        <section class="rounded-2xl bg-white p-6 shadow-card">
          <h3 class="mb-4 text-base font-bold text-ink-900">Ubicación</h3>
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label [class]="labelClass" for="state">Estado *</label>
              <select id="state" [class]="inputClass" formControlName="state">
                <option value="" disabled>Selecciona…</option>
                @for (opt of states; track opt.code) {
                  <option [value]="opt.code">{{ opt.name }}</option>
                }
              </select>
              @if (invalid('state')) {
                <p [class]="errorClass">Selecciona un estado.</p>
              }
            </div>
            <div>
              <label [class]="labelClass" for="municipality">Municipio *</label>
              <input id="municipality" [class]="inputClass" formControlName="municipality" />
              @if (invalid('municipality')) {
                <p [class]="errorClass">El municipio es obligatorio.</p>
              }
            </div>
            <div class="sm:col-span-2">
              <label [class]="labelClass" for="address">Dirección</label>
              <input id="address" [class]="inputClass" formControlName="address" />
            </div>
          </div>
        </section>

        <!-- Acerca de -->
        <section class="rounded-2xl bg-white p-6 shadow-card">
          <h3 class="mb-4 text-base font-bold text-ink-900">Acerca de la empresa</h3>
          <textarea rows="5" [class]="inputClass" formControlName="companyDescription" maxlength="2000" placeholder="Describe tu empresa…"></textarea>
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

  protected readonly inputClass = INPUT;
  protected readonly readonlyClass = READONLY_INPUT;
  protected readonly labelClass = LABEL;
  protected readonly errorClass = ERROR;
  protected readonly states = MX_STATES;
  protected readonly taxRegimes = SAT_TAX_REGIMES;
  protected readonly cfdiUses = SAT_CFDI_USES;
  protected readonly companyTypes = COMPANY_TYPE_OPTIONS;
  protected readonly currentYear = new Date().getFullYear();

  protected readonly profile = this.facade.profile;
  protected readonly saving = signal(false);
  protected readonly savingLogo = signal(false);
  protected readonly logoDraft = signal('');
  protected readonly banner = signal<string | null>(null);
  protected readonly bannerTone = signal<'success' | 'error'>('success');

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
      this.logoDraft.set(profile.logoUrl ?? '');
    });
  }

  protected reload(): void {
    this.facade.load().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  protected onLogoInput(event: Event): void {
    this.logoDraft.set((event.target as HTMLInputElement).value);
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

  protected invalid(control: keyof typeof this.form.controls): boolean {
    const ctrl = this.form.controls[control];
    return ctrl.invalid && (ctrl.dirty || ctrl.touched);
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
      .updateLogo({ logoUrl: this.logoDraft().trim() || null })
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
