import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MX_STATES } from '@/shared/catalogs/mx.catalogs';
import { IjIcon } from '@/shared/ui';
import {
  EMPLOYMENT_TYPE_LABELS,
  EmploymentType,
  PublicVacancy,
  WORK_MODE_LABELS,
  WorkMode,
} from '@/features/public/vacancies/models/public-vacancies.models';

const STATE_NAMES = new Map(MX_STATES.map((s) => [s.code, s.name]));

/** Tarjeta de vacante del portal. Respeta la confidencialidad de la empresa. */
@Component({
  selector: 'app-vacancy-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterLink, IjIcon],
  host: { class: 'block' },
  template: `
    <a
      [routerLink]="['/vacantes', vacancy().id]"
      class="block rounded-2xl bg-white p-5 shadow-card transition-shadow hover:shadow-float"
      [class.ring-1]="vacancy().isFeatured"
      [class.ring-brand]="vacancy().isFeatured"
    >
      <div class="flex items-start gap-4">
        <span
          class="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-50 text-[15px] font-bold text-brand"
        >
          @if (vacancy().company?.logoUrl; as logo) {
            <img [src]="logo" alt="" class="h-full w-full object-cover" />
          } @else {
            {{ initials() }}
          }
        </span>

        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <h3 class="text-base font-bold text-ink-900">{{ vacancy().title }}</h3>
            @if (vacancy().isFeatured) {
              <span class="rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand">
                Destacada
              </span>
            }
            @if (vacancy().isUrgent) {
              <span class="rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700">
                Urgente
              </span>
            }
            @if (vacancy().isVerified) {
              <span class="rounded-md bg-accent-blue-soft px-2 py-0.5 text-[11px] font-bold text-accent-blue">
                Verificada
              </span>
            }
          </div>

          <p class="mt-1 text-[13.5px] font-semibold text-body">
            {{ companyName() }}
          </p>

          <div class="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-muted">
            <span class="inline-flex items-center gap-1.5">
              <ij-icon name="map-pin" [size]="15" />
              {{ location() }}
            </span>
            <span class="inline-flex items-center gap-1.5">
              <ij-icon name="briefcase" [size]="15" />
              {{ employmentLabel() }} · {{ workModeLabel() }}
            </span>
            <span class="inline-flex items-center gap-1.5">
              <ij-icon name="dollar" [size]="15" />
              {{ salary() }}
            </span>
          </div>
        </div>

        <span class="hidden flex-shrink-0 text-[12.5px] text-muted sm:block">
          {{ vacancy().refreshedAt || vacancy().publishedAt | date: 'dd MMM' }}
        </span>
      </div>
    </a>
  `,
})
export class VacancyCard {
  readonly vacancy = input.required<PublicVacancy>();

  protected companyName(): string {
    return this.vacancy().company?.businessName ?? 'Empresa confidencial';
  }

  protected initials(): string {
    const name = this.vacancy().company?.businessName;
    if (!name) return '··';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return (parts[0]?.[0] ?? '?').concat(parts[1]?.[0] ?? '').toUpperCase();
  }

  protected location(): string {
    const vacancy = this.vacancy();
    return `${vacancy.municipality}, ${STATE_NAMES.get(vacancy.state) ?? vacancy.state}`;
  }

  protected employmentLabel(): string {
    const type = this.vacancy().employmentType as EmploymentType;
    return EMPLOYMENT_TYPE_LABELS[type] ?? type;
  }

  protected workModeLabel(): string {
    const mode = this.vacancy().workMode as WorkMode;
    return WORK_MODE_LABELS[mode] ?? mode;
  }

  protected salary(): string {
    const { salaryMin, salaryMax } = this.vacancy();
    if (salaryMin === null && salaryMax === null) return 'Salario a convenir';
    const format = (amount: number) =>
      new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        maximumFractionDigits: 0,
      }).format(amount);
    if (salaryMin !== null && salaryMax !== null) {
      return `${format(salaryMin)} – ${format(salaryMax)}`;
    }
    return format((salaryMin ?? salaryMax)!);
  }
}
