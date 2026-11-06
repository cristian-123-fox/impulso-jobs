import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { IjIcon } from '@/shared/ui';
import { IjReveal } from '@/shared/directives/reveal';
import { AboutTeamMember } from '@/features/public/about/models/about.models';

/**
 * Sección "Detrás de Impulso Jobs".
 *
 * Es presentacional: recibe los miembros ya resueltos y no conoce la fuente de
 * datos. Si la lista está vacía no pinta nada — así el build de producción no
 * publica los datos de ejemplo del catálogo.
 *
 * Sin foto se muestran las iniciales; nunca un hueco roto. Las fotos reales van
 * en `public/assets/images/team/` y se referencian desde `TEAM_MEMBERS`.
 */
@Component({
  selector: 'app-about-team',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjIcon, IjReveal, TranslocoDirective],
  template: `
    @if (members().length) {
      <section
        id="equipo"
        *transloco="let t"
        aria-labelledby="team-title"
        class="scroll-mt-24 bg-surface px-6 py-20 lg:px-[60px]"
      >
        <div class="mx-auto max-w-[1080px]">
          <div class="max-w-[640px]">
            <p class="text-[12.5px] font-semibold uppercase tracking-[0.18em] text-brand-strong">
              {{ t('about.team.eyebrow') }}
            </p>
            <h2
              id="team-title"
              class="mt-3 text-3xl font-bold leading-tight text-ink-900 sm:text-[40px]"
            >
              {{ t('about.team.title') }}
            </h2>
            <p class="mt-4 text-[15px] leading-relaxed text-muted">
              {{ t('about.team.lead') }}
            </p>
          </div>

          <ul class="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            @for (member of members(); track member.id; let i = $index) {
              <li
                ijReveal
                [revealDelay]="i * 90"
                class="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card"
              >
                <div class="aspect-[4/5] overflow-hidden bg-brand-50">
                  @if (member.photo) {
                    <img
                      [src]="member.photo"
                      [alt]="member.name"
                      width="640"
                      height="800"
                      loading="lazy"
                      decoding="async"
                      class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  } @else {
                    <div
                      class="flex h-full w-full items-center justify-center text-[40px] font-bold text-brand-strong"
                    >
                      {{ initials(member.name) }}
                    </div>
                  }
                </div>

                <div class="flex flex-1 flex-col p-6">
                  <h3 class="text-lg font-bold text-ink-900">
                    {{ member.name }}
                  </h3>
                  <p
                    class="mt-1 text-[12.5px] font-semibold uppercase tracking-wide text-brand-strong"
                  >
                    {{ t(member.roleKey) }}
                  </p>
                  <p class="mt-3 flex-1 text-[14px] leading-relaxed text-muted">
                    {{ t(member.bioKey) }}
                  </p>

                  @if (member.linkedin) {
                    <a
                      [href]="member.linkedin"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="mt-5 inline-flex items-center gap-2 text-[13px] font-semibold text-brand-strong hover:text-brand-600"
                      [attr.aria-label]="
                        t('about.team.linkedin', { name: member.name })
                      "
                    >
                      <ij-icon name="share" [size]="15" [strokeWidth]="2" />
                      LinkedIn
                    </a>
                  }
                </div>
              </li>
            }
          </ul>
        </div>
      </section>
    }
  `,
})
export class AboutTeam {
  readonly members = input.required<readonly AboutTeamMember[]>();

  /** Iniciales para el fallback sin foto: "Ana Martínez" → "AM". */
  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }
}
