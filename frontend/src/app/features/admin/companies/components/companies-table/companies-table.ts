import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IjIcon } from '@/shared/ui';
import { MX_STATES } from '@/shared/catalogs/mx.catalogs';
import { AdminCompany } from '@/features/admin/companies/models/companies.models';

const STATE_NAMES = new Map(MX_STATES.map((s) => [s.code, s.name]));

/** Tabla de empresas registradas. */
@Component({
  selector: 'app-companies-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, IjIcon],
  template: `
    <div class="overflow-x-auto rounded-2xl bg-white shadow-card">
      <table class="w-full min-w-[880px] border-collapse text-left">
        <thead>
          <tr class="border-b border-line">
            @for (h of headers; track h) {
              <th class="px-5 py-3.5 text-[11.5px] font-bold uppercase tracking-wide text-muted">
                {{ h }}
              </th>
            }
          </tr>
        </thead>
        <tbody>
          @for (company of companies(); track company.id) {
            <tr class="border-b border-line/70 transition-colors hover:bg-surface">
              <td class="px-5 py-3.5">
                <div class="flex items-center gap-3">
                  <span
                    class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] bg-brand-50 text-[13px] font-bold text-brand"
                  >
                    {{ initials(company.businessName) }}
                  </span>
                  <div class="min-w-0">
                    <div class="truncate text-sm font-semibold text-ink-900">
                      {{ company.businessName }}
                    </div>
                    <div class="truncate text-[12.5px] text-muted">{{ company.legalName }}</div>
                  </div>
                </div>
              </td>
              <td class="px-5 py-3.5">
                <span class="rounded-md bg-surface px-2 py-1 text-[12px] font-bold text-body">
                  {{ company.rfc }}
                </span>
              </td>
              <td class="px-5 py-3.5 text-[13.5px] text-body">
                {{ stateName(company.state) }} · {{ company.municipality }}
              </td>
              <td class="px-5 py-3.5 text-[13.5px]">
                @if (company.ownerEmail) {
                  <span class="text-body">{{ company.ownerEmail }}</span>
                } @else {
                  <span
                    class="rounded-md bg-accent-amber-soft px-2 py-1 text-[11.5px] font-bold text-[#b26a15]"
                    title="La empresa no tiene una cuenta de acceso vinculada."
                  >
                    Sin usuario
                  </span>
                }
              </td>
              <td class="px-5 py-3.5 text-sm font-bold text-ink-900">
                {{ company.memberCount }}
              </td>
              <td class="px-5 py-3.5 text-[13px] text-muted">
                {{ company.createdAt | date: 'dd MMM yyyy' }}
              </td>
              <td class="px-5 py-3.5">
                <div class="flex justify-end">
                  <button
                    type="button"
                    class="flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-[12.5px] font-bold text-body transition-colors hover:bg-surface hover:text-brand"
                    title="Ver la ficha y gestionar su equipo"
                    (click)="open.emit(company)"
                  >
                    <ij-icon name="users" [size]="14" />
                    Equipo
                  </button>
                </div>
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="7" class="px-5 py-10 text-center text-[13.5px] text-muted">
                No hay empresas registradas todavía.
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class CompaniesTable {
  readonly companies = input.required<readonly AdminCompany[]>();
  /** Abre la ficha de la empresa (datos + equipo). */
  readonly open = output<AdminCompany>();

  protected readonly headers = [
    'Empresa',
    'RFC',
    'Ubicación',
    'Usuario dueño',
    'Miembros',
    'Alta',
    '',
  ];

  protected stateName(code: string): string {
    return STATE_NAMES.get(code) ?? code;
  }

  protected initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return (parts[0]?.[0] ?? '?').concat(parts[1]?.[0] ?? '').toUpperCase();
  }
}
