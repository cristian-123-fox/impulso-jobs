import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiErrorResponse } from '@/core/models/api-response.models';
import { MX_STATES, SAT_TAX_REGIMES } from '@/shared/catalogs/mx.catalogs';
import { IjButton, IjIcon, IjModal } from '@/shared/ui';
import { AdminConfirm } from '@/features/admin/shared/admin-confirm/admin-confirm';
import { AdminError } from '@/features/admin/shared/admin-error/admin-error';
import { AdminTableSkeleton } from '@/features/admin/shared/admin-table-skeleton/admin-table-skeleton';
import { CompaniesApi } from '@/features/admin/companies/data/companies.api';
import { CompanyMembersTable } from '@/features/admin/companies/components/company-members-table/company-members-table';
import { CompanyEditForm } from '@/features/admin/companies/components/company-edit-form/company-edit-form';
import { CompanyMemberForm } from '@/features/admin/companies/components/company-member-form/company-member-form';
import { CompanyMemberRoleForm } from '@/features/admin/companies/components/company-member-role-form/company-member-role-form';
import {
  AddCompanyMemberPayload,
  AdminCompany,
  CompanyMember,
  CompanyMemberRole,
  UpdateCompanyPayload,
} from '@/features/admin/companies/models/companies.models';

const STATE_NAMES = new Map(MX_STATES.map((s) => [s.code, s.name]));
const TAX_REGIME_NAMES = new Map(SAT_TAX_REGIMES.map((r) => [r.code, r.name]));

/** Ficha de la empresa y gestión de su equipo (roles internos). */
@Component({
  selector: 'app-company-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    AdminConfirm,
    AdminError,
    AdminTableSkeleton,
    CompanyMembersTable,
    CompanyEditForm,
    CompanyMemberForm,
    CompanyMemberRoleForm,
    IjButton,
    IjIcon,
    IjModal,
  ],
  template: `
    <div class="mx-auto max-w-[1180px]">
      <a
        routerLink="/admin/empresas"
        class="mb-4 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-muted transition-colors hover:text-brand-strong"
      >
        <ij-icon name="chevron-left" [size]="16" />
        Empresas
      </a>

      @switch (state()) {
        @case ('loading') {
          <app-admin-table-skeleton [rows]="4" label="Cargando empresa…" />
        }
        @case ('error') {
          <app-admin-error
            message="No se pudo cargar la empresa."
            (retry)="load()"
          />
        }
        @default {
          @if (company(); as data) {
            <div class="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div class="flex items-center gap-4">
                <span
                  class="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-lg font-bold text-brand-strong"
                >
                  {{ initials(data.businessName) }}
                </span>
                <div>
                  <h1 class="text-2xl font-extrabold tracking-tight text-ink-900">
                    {{ data.businessName }}
                  </h1>
                  <p class="mt-1 text-[13.5px] text-muted">
                    {{ data.legalName }} · {{ data.rfc }}
                  </p>
                </div>
              </div>
              <button
                type="button"
                class="flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-[13.5px] font-bold text-body transition-colors hover:bg-surface"
                (click)="openEdit(data)"
              >
                <ij-icon name="pen" [size]="16" />
                Editar empresa
              </button>
            </div>

            <dl
              class="mb-6 grid gap-x-6 gap-y-4 rounded-2xl bg-white p-5 shadow-card sm:grid-cols-2 lg:grid-cols-3"
            >
              @for (item of details(data); track item.label) {
                <div>
                  <dt class="text-[11.5px] font-bold uppercase tracking-wide text-muted">
                    {{ item.label }}
                  </dt>
                  <dd class="mt-1 text-[13.5px] text-body">{{ item.value }}</dd>
                </div>
              }
            </dl>
          }

          <div class="mb-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 class="text-lg font-extrabold tracking-tight text-ink-900">
                Equipo de la empresa
              </h2>
              <p class="mt-1 text-[13px] text-muted">
                Usuarios con acceso a esta empresa y su rol interno.
              </p>
            </div>
            <button
              ij-button
              type="button"
              variant="primary"
              shape="rounded"
              size="md"
              (click)="openAdd()"
            >
              <ij-icon name="plus" [size]="16" />
              Agregar miembro
            </button>
          </div>

          @if (actionError(); as message) {
            <p
              role="alert"
              class="mb-4 rounded-xl bg-red-50 px-4 py-3 text-[13.5px] font-medium text-red-700"
            >
              {{ message }}
            </p>
          }

          <app-company-members-table
            [members]="members()"
            (changeRole)="openRole($event)"
            (remove)="onRemove($event)"
          />
        }
      }
    </div>

    @if (editingCompany(); as data) {
      <ij-modal
        title="Editar empresa"
        [subtitle]="data.businessName"
        size="lg"
        (close)="closeForms()"
      >
        <app-company-edit-form
          [company]="data"
          [submitting]="saving()"
          [error]="formError()"
          (save)="onUpdateCompany($event)"
          (cancel)="closeForms()"
        />
      </ij-modal>
    }

    @if (showAdd()) {
      <ij-modal
        title="Agregar miembro"
        subtitle="Vincula una cuenta existente o crea una nueva."
        (close)="closeForms()"
      >
        <app-company-member-form
          [submitting]="saving()"
          [error]="formError()"
          (add)="onAdd($event)"
          (cancel)="closeForms()"
        />
      </ij-modal>
    }

    @if (editing(); as member) {
      <ij-modal
        title="Rol interno"
        [subtitle]="member.email"
        size="sm"
        (close)="closeForms()"
      >
        <app-company-member-role-form
          [member]="member"
          [submitting]="saving()"
          [error]="formError()"
          (save)="onRoleChange(member, $event)"
          (cancel)="closeForms()"
        />
      </ij-modal>
    }

    @if (removing(); as member) {
      <app-admin-confirm
        title="Quitar del equipo"
        [message]="removeMessage(member)"
        confirmLabel="Quitar del equipo"
        (confirm)="onRemoveConfirmed(member)"
        (cancel)="removing.set(null)"
      />
    }
  `,
})
export class CompanyDetailPage {
  private readonly api = inject(CompaniesApi);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  private readonly companyId = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly company = signal<AdminCompany | null>(null);
  protected readonly members = signal<CompanyMember[]>([]);
  protected readonly state = signal<'loading' | 'loaded' | 'error'>('loading');

  protected readonly showAdd = signal(false);
  protected readonly editingCompany = signal<AdminCompany | null>(null);
  protected readonly editing = signal<CompanyMember | null>(null);
  protected readonly removing = signal<CompanyMember | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);

  constructor() {
    this.load();
  }

  protected load(): void {
    this.state.set('loading');
    this.api
      .get(this.companyId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (company) => {
          this.company.set(company);
          this.state.set('loaded');
          this.loadMembers();
        },
        error: () => this.state.set('error'),
      });
  }

  private loadMembers(): void {
    this.api
      .listMembers(this.companyId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (members) => this.members.set(members),
        error: (error: unknown) =>
          this.actionError.set(
            this.messageOf(error, 'No se pudo cargar el equipo.'),
          ),
      });
  }

  protected openEdit(company: AdminCompany): void {
    this.showAdd.set(false);
    this.editing.set(null);
    this.formError.set(null);
    this.editingCompany.set(company);
  }

  protected openAdd(): void {
    this.editingCompany.set(null);
    this.editing.set(null);
    this.formError.set(null);
    this.showAdd.set(true);
  }

  protected openRole(member: CompanyMember): void {
    this.editingCompany.set(null);
    this.showAdd.set(false);
    this.formError.set(null);
    this.editing.set(member);
  }

  protected closeForms(): void {
    this.showAdd.set(false);
    this.editingCompany.set(null);
    this.editing.set(null);
    this.formError.set(null);
  }

  protected onUpdateCompany(payload: UpdateCompanyPayload): void {
    this.saving.set(true);
    this.formError.set(null);
    this.api
      .update(this.companyId, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.saving.set(false);
          this.closeForms();
          this.company.set(updated);
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.formError.set(
            this.messageOf(error, 'No se pudo actualizar la empresa.'),
          );
        },
      });
  }

  protected onAdd(payload: AddCompanyMemberPayload): void {
    this.saving.set(true);
    this.formError.set(null);
    this.api
      .addMember(this.companyId, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.closeForms();
          this.loadMembers();
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.formError.set(
            this.messageOf(error, 'No se pudo agregar al miembro.'),
          );
        },
      });
  }

  protected onRoleChange(member: CompanyMember, role: CompanyMemberRole): void {
    this.saving.set(true);
    this.formError.set(null);
    this.api
      .updateMemberRole(this.companyId, member.userId, role)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.saving.set(false);
          this.closeForms();
          this.members.update((list) =>
            list.map((m) => (m.userId === updated.userId ? updated : m)),
          );
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.formError.set(
            this.messageOf(error, 'No se pudo cambiar el rol interno.'),
          );
        },
      });
  }

  protected onRemove(member: CompanyMember): void {
    this.removing.set(member);
  }

  protected removeMessage(member: CompanyMember): string {
    return `¿Quitar a ${member.email} del equipo? Su cuenta se conserva, pero dejará de pertenecer a esta empresa.`;
  }

  protected onRemoveConfirmed(member: CompanyMember): void {
    this.removing.set(null);
    this.actionError.set(null);
    this.api
      .removeMember(this.companyId, member.userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.loadMembers(),
        error: (error: unknown) =>
          this.actionError.set(
            this.messageOf(error, 'No se pudo quitar al miembro.'),
          ),
      });
  }

  protected initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return (parts[0]?.[0] ?? '?').concat(parts[1]?.[0] ?? '').toUpperCase();
  }

  protected details(
    company: AdminCompany,
  ): readonly { label: string; value: string }[] {
    return [
      { label: 'RFC', value: company.rfc },
      {
        label: 'Régimen fiscal',
        value: TAX_REGIME_NAMES.get(company.taxRegime) ?? company.taxRegime,
      },
      { label: 'Código postal', value: company.postalCode },
      {
        label: 'Ubicación',
        value: `${STATE_NAMES.get(company.state) ?? company.state} · ${company.municipality}`,
      },
      { label: 'Sector', value: company.economicSector || 'Sin registrar' },
      { label: 'Correo corporativo', value: company.corporateEmail || 'Sin registrar' },
      { label: 'Teléfono', value: company.phoneNumber || 'Sin registrar' },
      { label: 'Sitio web', value: company.website || 'Sin registrar' },
      { label: 'Usuario dueño', value: company.ownerEmail || 'Sin asignar' },
    ];
  }

  private messageOf(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as ApiErrorResponse | null;
      return body?.errors?.[0]?.message ?? body?.message ?? fallback;
    }
    return fallback;
  }
}
