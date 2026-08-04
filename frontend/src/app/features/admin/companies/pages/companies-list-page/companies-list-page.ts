import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ApiErrorResponse } from '@/core/models/api-response.models';
import { IjButton, IjIcon, IjModal } from '@/shared/ui';
import { AdminPagination } from '@/features/admin/shared/admin-pagination/admin-pagination';
import { CompaniesFacade } from '@/features/admin/companies/data/companies.facade';
import { CompaniesFilters } from '@/features/admin/companies/components/companies-filters/companies-filters';
import { CompaniesTable } from '@/features/admin/companies/components/companies-table/companies-table';
import { CompanyCreateForm } from '@/features/admin/companies/components/company-create-form/company-create-form';
import { CreateCompanyPayload } from '@/features/admin/companies/models/companies.models';

@Component({
  selector: 'app-companies-list-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AdminPagination,
    CompaniesFilters,
    CompaniesTable,
    CompanyCreateForm,
    IjButton,
    IjIcon,
    IjModal,
  ],
  template: `
    <div class="mx-auto max-w-[1180px]">
      <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="text-2xl font-extrabold tracking-tight text-ink-900">Empresas</h1>
          <p class="mt-1.5 text-[13.5px] text-muted">
            Empresas registradas y su cuenta de acceso.
          </p>
        </div>
        <button
          ij-button
          type="button"
          variant="primary"
          shape="rounded"
          size="md"
          (click)="openCreate()"
        >
          <ij-icon name="plus" [size]="16" />
          Nueva empresa
        </button>
      </div>

      @if (created(); as message) {
        <p
          class="mb-5 rounded-xl bg-accent-green-soft px-4 py-3 text-[13.5px] font-semibold text-accent-green"
        >
          {{ message }}
        </p>
      }

      <app-companies-filters
        class="mb-4 block"
        [(search)]="facade.search"
        [(stateCode)]="facade.stateCode"
        (apply)="facade.applyFilters()"
        (clear)="facade.clearFilters()"
      />

      @switch (facade.state()) {
        @case ('loading') {
          <div class="rounded-2xl bg-white p-10 text-center text-muted shadow-card">
            Cargando empresas…
          </div>
        }
        @case ('error') {
          <div class="rounded-2xl bg-white p-10 text-center text-red-600 shadow-card">
            No se pudieron cargar las empresas.
          </div>
        }
        @default {
          <app-companies-table
            [companies]="facade.companies()"
            (addUser)="goToUsers()"
          />
          <app-admin-pagination
            [page]="facade.page()"
            [pages]="facade.pages()"
            [total]="facade.total()"
            (pageChange)="facade.load($event)"
          />
        }
      }
    </div>

    @if (showCreate()) {
      <ij-modal
        title="Nueva empresa"
        subtitle="Puedes crear a la vez su cuenta de acceso."
        size="lg"
        (close)="closeCreate()"
      >
        <app-company-create-form
          [submitting]="saving()"
          [error]="formError()"
          (create)="onCreate($event)"
          (cancel)="closeCreate()"
        />
      </ij-modal>
    }
  `,
})
export class CompaniesListPage {
  protected readonly facade = inject(CompaniesFacade);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly showCreate = signal(false);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly created = signal<string | null>(null);

  constructor() {
    this.facade.load(1);
  }

  protected openCreate(): void {
    this.formError.set(null);
    this.created.set(null);
    this.showCreate.set(true);
  }

  protected closeCreate(): void {
    this.showCreate.set(false);
    this.formError.set(null);
  }

  protected onCreate(payload: CreateCompanyPayload): void {
    this.saving.set(true);
    this.formError.set(null);
    this.facade
      .create(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.saving.set(false);
          this.closeCreate();
          this.created.set(
            result.ownerUserId
              ? `Empresa "${result.company.businessName}" creada con la cuenta ${result.company.ownerEmail}, lista para iniciar sesión.`
              : `Empresa "${result.company.businessName}" creada. Crea un usuario empleador para poder usarla.`,
          );
          this.facade.load(1);
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.formError.set(this.messageOf(error));
        },
      });
  }

  protected goToUsers(): void {
    void this.router.navigate(['/admin/usuarios']);
  }

  private messageOf(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as ApiErrorResponse | null;
      return (
        body?.errors?.[0]?.message ??
        body?.message ??
        'No se pudo crear la empresa.'
      );
    }
    return 'No se pudo crear la empresa.';
  }
}
