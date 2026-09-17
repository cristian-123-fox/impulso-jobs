import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { AppTranslateService } from '@/core/i18n/app-translate.service';
import { LocaleFormatService } from '@/core/i18n/locale-format.service';
import { MX_STATES } from '@/shared/catalogs/mx.catalogs';
import { vacancyPath } from '@/shared/utils/seo';
import { IjIcon } from '@/shared/ui';
import { PublicVacancy } from '@/features/public/vacancies/models/public-vacancies.models';

const STATE_NAMES = new Map(MX_STATES.map((s) => [s.code, s.name]));
const NEW_BADGE_DAYS = 7;

/** Tarjeta de vacante del portal. Respeta la confidencialidad de la empresa. */
@Component({
  selector: 'app-vacancy-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IjIcon, TranslocoDirective],
  host: { class: 'block' },
  template: `
    @if (disableLink()) {
      <div
        *transloco="let t"
        class="flex gap-4 rounded-2xl bg-white p-5 shadow-card transition-shadow hover:shadow-float sm:gap-5"
        [class.ring-1]="vacancy().isFeatured"
        [class.ring-brand]="vacancy().isFeatured"
      >
        <span
          class="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-line bg-brand-50 text-[19px] font-extrabold text-brand-strong sm:h-20 sm:w-20"
        >
          @if (logoUrl(); as logo) {
            <img
              [src]="logo"
              alt=""
              class="h-full w-full object-cover"
              loading="lazy"
              (error)="onLogoError()"
            />
          } @else {
            {{ initials() }}
          }
        </span>

        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h3 class="text-[15.5px] font-bold text-ink-900">{{ vacancy().title }}</h3>
            <span class="text-[12.5px] font-semibold text-accent-green-strong">
              / {{ postedAgo() }}
            </span>
          </div>

          @if (vacancy().isFeatured || vacancy().isUrgent || vacancy().isVerified) {
            <div class="mt-1 flex flex-wrap items-center gap-1.5">
              @if (vacancy().isFeatured) {
                <span class="rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-strong">
                  {{ t('card.featured') }}
                </span>
              }
              @if (vacancy().isUrgent) {
                <span class="rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700">
                  {{ t('card.urgent') }}
                </span>
              }
              @if (vacancy().isVerified) {
                <span class="rounded-md bg-accent-blue-soft px-2 py-0.5 text-[11px] font-bold text-accent-blue-strong">
                  {{ t('card.verified') }}
                </span>
              }
            </div>
          }

          <p class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
            <span class="inline-flex items-center gap-1.5">
              <ij-icon name="map-pin" [size]="15" />
              {{ location() }}
            </span>
            <span class="hidden sm:inline">·</span>
            <span>{{ employmentLabel() }} · {{ workModeLabel() }}</span>
          </p>

          <p class="mt-2 truncate text-[13.5px] font-semibold text-brand-strong">
            {{ companyName() }}
          </p>
        </div>

        <div class="hidden flex-shrink-0 flex-col items-end justify-between gap-2 text-right sm:flex">
          @if (isNew()) {
            <span class="rounded-md bg-accent-green-strong px-2.5 py-1 text-[11.5px] font-bold text-white">
              {{ t('card.new') }}
            </span>
          } @else {
            <span class="rounded-md bg-brand-50 px-2.5 py-1 text-[11.5px] font-bold text-brand-strong">
              {{ employmentLabel() }}
            </span>
          }

          <div>
            <span class="text-[14px] font-extrabold text-ink-900">{{ salary() }}</span>
            @if (hasSalary()) {
              <span class="text-[12px] font-semibold text-muted">
                {{ t('card.perMonth') }}</span
              >
            }
          </div>

          <span class="text-[13px] font-bold text-brand-strong">{{ t('card.view') }}</span>
        </div>
      </div>
    } @else {
      <a
        *transloco="let t"
        [routerLink]="detailPath()"
        class="flex gap-4 rounded-2xl bg-white p-5 shadow-card transition-shadow hover:shadow-float sm:gap-5"
        [class.ring-1]="vacancy().isFeatured"
        [class.ring-brand]="vacancy().isFeatured"
      >
        <span
          class="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-line bg-brand-50 text-[19px] font-extrabold text-brand-strong sm:h-20 sm:w-20"
        >
          @if (logoUrl(); as logo) {
            <img
              [src]="logo"
              alt=""
              class="h-full w-full object-cover"
              loading="lazy"
              (error)="onLogoError()"
            />
          } @else {
            {{ initials() }}
          }
        </span>

        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h3 class="text-[15.5px] font-bold text-ink-900">{{ vacancy().title }}</h3>
            <span class="text-[12.5px] font-semibold text-accent-green-strong">
              / {{ postedAgo() }}
            </span>
          </div>

          @if (vacancy().isFeatured || vacancy().isUrgent || vacancy().isVerified) {
            <div class="mt-1 flex flex-wrap items-center gap-1.5">
              @if (vacancy().isFeatured) {
                <span class="rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-strong">
                  {{ t('card.featured') }}
                </span>
              }
              @if (vacancy().isUrgent) {
                <span class="rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700">
                  {{ t('card.urgent') }}
                </span>
              }
              @if (vacancy().isVerified) {
                <span class="rounded-md bg-accent-blue-soft px-2 py-0.5 text-[11px] font-bold text-accent-blue-strong">
                  {{ t('card.verified') }}
                </span>
              }
            </div>
          }

          <p class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
            <span class="inline-flex items-center gap-1.5">
              <ij-icon name="map-pin" [size]="15" />
              {{ location() }}
            </span>
            <span class="hidden sm:inline">·</span>
            <span>{{ employmentLabel() }} · {{ workModeLabel() }}</span>
          </p>

          <p class="mt-2 truncate text-[13.5px] font-semibold text-brand-strong">
            {{ companyName() }}
          </p>
        </div>

        <div class="hidden flex-shrink-0 flex-col items-end justify-between gap-2 text-right sm:flex">
          @if (isNew()) {
            <span class="rounded-md bg-accent-green-strong px-2.5 py-1 text-[11.5px] font-bold text-white">
              {{ t('card.new') }}
            </span>
          } @else {
            <span class="rounded-md bg-brand-50 px-2.5 py-1 text-[11.5px] font-bold text-brand-strong">
              {{ employmentLabel() }}
            </span>
          }

          <div>
            <span class="text-[14px] font-extrabold text-ink-900">{{ salary() }}</span>
            @if (hasSalary()) {
              <span class="text-[12px] font-semibold text-muted">
                {{ t('card.perMonth') }}</span
              >
            }
          </div>

          <span class="text-[13px] font-bold text-brand-strong">{{ t('card.view') }}</span>
        </div>
      </a>
    }
  `,
})
export class VacancyCard {
  readonly vacancy = input.required<PublicVacancy>();
  /** Cuando true, la tarjeta no enlaza (para usar con click del padre, p. ej. modal). */
  readonly disableLink = input(false);

  private readonly i18n = inject(AppTranslateService);
  private readonly format = inject(LocaleFormatService);

  /**
   * Un `logoUrl` que devuelve 404 dejaba un recuadro vacío en la tarjeta (le
   * pasa hoy a las empresas sembradas, que apuntan a un CDN inexistente). Al
   * fallar la carga se cae a las iniciales, que es el mismo aspecto que tiene
   * una empresa sin logo.
   */
  private readonly logoFailed = signal(false);

  protected readonly logoUrl = computed(() =>
    this.logoFailed() ? null : this.vacancy().company?.logoUrl,
  );

  protected onLogoError(): void {
    this.logoFailed.set(true);
  }

  /** URL canónica con slug (T16). */
  protected detailPath(): string {
    return vacancyPath(this.vacancy());
  }

  protected companyName(): string {
    return (
      this.vacancy().company?.businessName ??
      this.i18n.t('card.confidential')
    );
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
    return this.i18n.enumLabel('employmentType', this.vacancy().employmentType);
  }

  protected workModeLabel(): string {
    return this.i18n.enumLabel('workMode', this.vacancy().workMode);
  }

  protected postedAgo(): string {
    const days = this.daysSincePosted();
    if (days === null) return '';
    if (days <= 0) return this.i18n.t('card.postedToday');
    if (days === 1) return this.i18n.t('card.postedYesterday');
    if (days < 30) return this.i18n.t('card.postedDays', { days });
    const months = Math.floor(days / 30);
    return months === 1
      ? this.i18n.t('card.postedMonth')
      : this.i18n.t('card.postedMonths', { months });
  }

  protected isNew(): boolean {
    const days = this.daysSincePosted();
    return days !== null && days <= NEW_BADGE_DAYS;
  }

  protected hasSalary(): boolean {
    const { salaryMin, salaryMax } = this.vacancy();
    return salaryMin !== null || salaryMax !== null;
  }

  protected salary(): string {
    const { salaryMin, salaryMax } = this.vacancy();
    if (salaryMin === null && salaryMax === null) {
      return this.i18n.t('card.salaryTbd');
    }
    if (salaryMin !== null && salaryMax !== null) {
      return this.i18n.t('card.salaryRange', {
        min: this.format.currency(salaryMin),
        max: this.format.currency(salaryMax),
      });
    }
    return this.format.currency((salaryMin ?? salaryMax)!);
  }

  private daysSincePosted(): number | null {
    const reference =
      this.vacancy().refreshedAt || this.vacancy().publishedAt;
    if (!reference) return null;
    const elapsed = Date.now() - new Date(reference).getTime();
    return Math.floor(elapsed / 86_400_000);
  }
}
