import { DatePipe, UpperCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';
import { AppTranslateService } from '@/core/i18n/app-translate.service';
import { subdivisionName } from '@/shared/catalogs/countries.catalogs';
import { IjIcon } from '@/shared/ui';
import {
  CandidateDetail,
  CandidateResumeSummary,
} from '@/features/company/candidates/models/candidates.models';

/** Ficha completa del candidato: experiencia, formación, idiomas y CV. */
@Component({
  selector: 'app-candidate-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, UpperCasePipe, IjIcon],
  template: `
    @let data = candidate();

    <div class="flex flex-col gap-5">
      <div class="flex flex-wrap items-start gap-4">
        <div
          class="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-50 text-lg font-bold text-brand"
        >
          @if (data.profilePhotoUrl) {
            <img
              [src]="data.profilePhotoUrl"
              [alt]="'Foto de ' + data.firstName"
              class="h-full w-full object-cover"
            />
          } @else {
            {{ initials(data) }}
          }
        </div>
        <div class="min-w-0 flex-1">
          <h3 class="text-lg font-bold text-ink-900">
            {{ data.firstName }} {{ data.lastName }}
          </h3>
          <p class="text-[13.5px] text-muted">
            {{ data.professionalTitle || 'Sin título profesional' }} ·
            {{ location(data) }}
          </p>
          <div class="mt-2 flex flex-wrap gap-1.5">
            @if (data.isImmediatelyAvailable) {
              <span
                class="rounded-md bg-accent-green-soft px-2 py-0.5 text-[11.5px] font-bold text-accent-green"
              >
                Disponibilidad inmediata
              </span>
            }
            @if (data.email) {
              <span class="rounded-md bg-surface px-2 py-0.5 text-[11.5px] font-bold text-body">
                {{ data.email }}
              </span>
            } @else {
              <span
                class="rounded-md bg-accent-amber-soft px-2 py-0.5 text-[11.5px] font-bold text-[#b26a15]"
                title="Los datos de contacto son un beneficio del plan contratado."
              >
                Contacto oculto por el plan
              </span>
            }
          </div>
        </div>
      </div>

      @if (data.summary) {
        <p class="rounded-xl bg-surface px-4 py-3 text-[13.5px] text-body">
          {{ data.summary }}
        </p>
      }

      @if (data.skills.length) {
        <section>
          <h4 class="mb-2 text-[13px] font-bold uppercase tracking-wide text-muted">
            Habilidades
          </h4>
          <div class="flex flex-wrap gap-1.5">
            @for (skill of data.skills; track skill.name) {
              <span class="rounded-lg bg-brand-50 px-2.5 py-1 text-[12.5px] font-semibold text-brand">
                {{ skill.name }}@if (skill.yearsExperience) {
                  <span class="font-normal opacity-75"> · {{ skill.yearsExperience }} a.</span>
                }
              </span>
            }
          </div>
        </section>
      }

      @if (data.experiences.length) {
        <section>
          <h4 class="mb-2 text-[13px] font-bold uppercase tracking-wide text-muted">
            Experiencia
          </h4>
          <ul class="flex flex-col gap-3">
            @for (item of data.experiences; track item.jobTitle + item.startDate) {
              <li class="rounded-xl border border-line px-4 py-3">
                <div class="text-[13.5px] font-semibold text-ink-900">{{ item.jobTitle }}</div>
                <div class="text-[12.5px] text-muted">
                  {{ item.companyName }} · {{ item.location }}
                </div>
                <div class="mt-0.5 text-[12px] text-muted">
                  {{ item.startDate | date: 'MMM yyyy' }} —
                  {{ item.isCurrent ? 'Actual' : (item.endDate | date: 'MMM yyyy') }}
                </div>
                @if (item.responsibilities) {
                  <p class="mt-1.5 text-[12.5px] text-body">{{ item.responsibilities }}</p>
                }
              </li>
            }
          </ul>
        </section>
      }

      @if (data.educations.length) {
        <section>
          <h4 class="mb-2 text-[13px] font-bold uppercase tracking-wide text-muted">
            Formación
          </h4>
          <ul class="flex flex-col gap-3">
            @for (item of data.educations; track item.degreeName + item.startDate) {
              <li class="rounded-xl border border-line px-4 py-3">
                <div class="text-[13.5px] font-semibold text-ink-900">{{ item.degreeName }}</div>
                <div class="text-[12.5px] text-muted">
                  {{ item.institutionName }}@if (item.fieldOfStudy) {
                    <span> · {{ item.fieldOfStudy }}</span>
                  }
                </div>
                <div class="mt-0.5 text-[12px] text-muted">
                  {{ item.startDate | date: 'MMM yyyy' }} —
                  {{ item.isCurrent ? 'En curso' : (item.endDate | date: 'MMM yyyy') }}
                </div>
              </li>
            }
          </ul>
        </section>
      }

      @if (data.languages.length) {
        <section>
          <h4 class="mb-2 text-[13px] font-bold uppercase tracking-wide text-muted">Idiomas</h4>
          <div class="flex flex-wrap gap-1.5">
            @for (item of data.languages; track item.languageCode) {
              <span class="rounded-lg bg-surface px-2.5 py-1 text-[12.5px] font-semibold text-body">
                {{ item.languageCode | uppercase }} · {{ item.level }}
                @if (item.isNative) {
                  <span class="font-normal opacity-75">(nativo)</span>
                }
              </span>
            }
          </div>
        </section>
      }

      @if (data.resumes.length) {
        <section>
          <h4 class="mb-2 text-[13px] font-bold uppercase tracking-wide text-muted">
            Hojas de vida
          </h4>
          <ul class="flex flex-col gap-2">
            @for (resume of data.resumes; track resume.id) {
              <li>
                <button
                  type="button"
                  class="flex w-full items-center gap-2.5 rounded-xl bg-surface px-4 py-2.5 text-left transition-colors hover:bg-brand-50 disabled:cursor-progress"
                  [title]="'Ver ' + resume.fileName"
                  [disabled]="busyResumeId() === resume.id"
                  (click)="openResume.emit(resume)"
                >
                  <ij-icon name="file" [size]="16" />
                  <span class="min-w-0 flex-1 truncate text-[13px] text-body">
                    {{ resume.fileName }}
                  </span>
                  @if (resume.isDefault) {
                    <span class="rounded-md bg-white px-2 py-0.5 text-[11px] font-bold text-brand">
                      Principal
                    </span>
                  }
                  <span class="flex items-center gap-1 text-[12px] font-semibold text-brand">
                    <ij-icon name="eye" [size]="14" />
                    {{ busyResumeId() === resume.id ? 'Abriendo…' : 'Ver' }}
                  </span>
                </button>
              </li>
            }
          </ul>
        </section>
      }
    </div>
  `,
})
export class CandidateDetailView {
  readonly candidate = input.required<CandidateDetail>();
  /** CV que se está descargando, para bloquear su fila mientras tanto. */
  readonly busyResumeId = input<string | null>(null);
  readonly openResume = output<CandidateResumeSummary>();

  private readonly i18n = inject(AppTranslateService);

  /**
   * «Medellín, Antioquia · Colombia». El nombre sale de `subdivisionName(país,
   * código)`: `GUA` es Guanajuato en México y Guainía en Colombia, así que sin
   * el país la ficha diría el sitio equivocado (T36 · R2).
   */
  protected location(candidate: CandidateDetail): string {
    const state = subdivisionName(candidate.country, candidate.state);
    const country = this.i18n.enumLabel('country', candidate.country);
    const place = [candidate.municipality, state ?? candidate.state]
      .filter(Boolean)
      .join(', ');
    return country ? `${place} · ${country}` : place;
  }

  protected initials(candidate: CandidateDetail): string {
    return (candidate.firstName[0] ?? '?')
      .concat(candidate.lastName[0] ?? '')
      .toUpperCase();
  }
}
