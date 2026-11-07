import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { IjIcon, TONE_SOFT, type Tone } from '@/shared/ui';
import { IjReveal } from '@/shared/directives/reveal';
import { AboutTeamMember } from '@/features/public/about/models/about.models';

/**
 * Barra superior de cada tarjeta. Los nombres van completos para que Tailwind
 * los detecte al compilar (no soporta clases construidas por concatenación).
 */
const TONE_BAR: Record<Tone, string> = {
  brand: 'from-brand to-brand-600',
  blue: 'from-accent-blue to-accent-blue-strong',
  green: 'from-accent-green to-accent-green-strong',
  amber: 'from-accent-amber to-accent-amber-strong',
  pink: 'from-accent-pink to-accent-pink-strong',
};

/**
 * Sección "Detrás de Impulso Jobs".
 *
 * Bloque oscuro a propósito: corta la sucesión de secciones claras de
 * `/nosotros` y hace que el equipo destaque. Cada tarjeta lleva un acento
 * (`tone`) en el avatar, el badge y la barra superior; sin foto se usan las
 * iniciales, así que nunca queda un hueco roto.
 *
 * Es presentacional: recibe los miembros ya resueltos. Si la lista está vacía
 * no pinta nada.
 */
@Component({
  selector: 'app-about-team',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjIcon, IjReveal, RouterLink, TranslocoDirective],
  template: `
    @if (members().length) {
      <section
        id="equipo"
        *transloco="let t"
        aria-labelledby="team-title"
        class="relative scroll-mt-24 overflow-hidden bg-ink-950 px-6 py-24 lg:px-[60px]"
      >
        <div
          aria-hidden="true"
          class="pointer-events-none absolute -left-24 top-8 h-72 w-72 rounded-full bg-brand/20 blur-3xl"
        ></div>
        <div
          aria-hidden="true"
          class="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-accent-blue/10 blur-3xl"
        ></div>

        <div class="relative mx-auto max-w-[1120px]">
          <div
            class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"
          >
            <div class="max-w-[640px]">
              <p
                class="text-[12px] font-semibold uppercase tracking-[0.22em] text-brand-50"
              >
                {{ t('about.team.eyebrow') }}
              </p>
              <h2
                id="team-title"
                class="mt-3 text-3xl font-bold leading-tight text-white sm:text-[42px]"
              >
                {{ t('about.team.title') }}
              </h2>
              <p class="mt-4 text-[15px] leading-relaxed text-white/70">
                {{ t('about.team.lead') }}
              </p>
            </div>

            <span
              class="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[12.5px] font-medium text-white/60"
            >
              <span class="h-1.5 w-1.5 rounded-full bg-brand"></span>
              {{ t('about.team.count', { count: members().length }) }}
            </span>
          </div>

          <ul class="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-6">
            @for (member of members(); track member.id; let i = $index) {
              <li [class]="cardSpan(i)">
                <article
                  ijReveal
                  [revealDelay]="i * 90"
                  class="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.07]"
                >
                  <span
                    aria-hidden="true"
                    [class]="
                      'absolute inset-x-0 top-0 h-1 bg-gradient-to-r ' +
                      bar[member.tone]
                    "
                  ></span>
                  <span
                    aria-hidden="true"
                    class="pointer-events-none absolute right-5 top-4 text-[44px] font-bold leading-none text-white/[0.05]"
                  >
                    {{ member.order.toString().padStart(2, '0') }}
                  </span>

                  <div class="flex items-start justify-between gap-4">
                    <div
                      [class]="
                        'flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-2xl font-bold ring-1 ring-white/10 ' +
                        soft[member.tone]
                      "
                    >
                      @if (member.photo) {
                        <img
                          [src]="member.photo"
                          [alt]="member.name"
                          width="160"
                          height="160"
                          loading="lazy"
                          decoding="async"
                          class="h-full w-full object-cover"
                        />
                      } @else {
                        {{ initials(member.name) }}
                      }
                    </div>
                    <span class="mt-1 text-white/20">
                      <ij-icon
                        [name]="member.icon"
                        [size]="22"
                        [strokeWidth]="1.6"
                      />
                    </span>
                  </div>

                  <span
                    [class]="
                      'mt-6 inline-flex w-fit rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] ' +
                      soft[member.tone]
                    "
                  >
                    {{ t(member.roleKey) }}
                  </span>

                  <h3 class="mt-3 text-[19px] font-bold leading-snug text-white">
                    {{ member.name }}
                  </h3>
                  <p class="mt-2 flex-1 text-[14px] leading-relaxed text-white/70">
                    {{ t(member.bioKey) }}
                  </p>

                  @if (member.linkedin) {
                    <a
                      [href]="member.linkedin"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="mt-5 inline-flex items-center gap-2 text-[13px] font-semibold text-white/70 transition-colors hover:text-brand-50"
                      [attr.aria-label]="
                        t('about.team.linkedin', { name: member.name })
                      "
                    >
                      <ij-icon name="share" [size]="15" [strokeWidth]="2" />
                      LinkedIn
                    </a>
                  }
                </article>
              </li>
            }
          </ul>

          <div
            class="mt-12 flex flex-col gap-4 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between"
          >
            <p class="text-[14px] text-white/60">{{ t('about.team.join') }}</p>
            <a
              routerLink="/vacantes"
              class="inline-flex items-center gap-2 text-[14px] font-semibold text-brand-50 transition-colors hover:text-white"
            >
              {{ t('about.team.joinCta') }}
              <ij-icon name="arrow-up" [size]="16" [strokeWidth]="2" />
            </a>
          </div>
        </div>
      </section>
    }
  `,
})
export class AboutTeam {
  readonly members = input.required<readonly AboutTeamMember[]>();

  protected readonly soft = TONE_SOFT;
  protected readonly bar = TONE_BAR;

  /** Iniciales para el fallback sin foto: "Ana Martínez" → "AM". */
  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  /**
   * En una rejilla de 6 columnas cada tarjeta ocupa 2 (3 por fila). Si la
   * última fila queda incompleta, la centra: una tarjeta en la columna 3 o dos
   * a partir de la 2. Así 5 personas no dejan un hueco raro a la derecha.
   */
  protected cardSpan(index: number): string {
    const total = this.members().length;
    const remainder = total % 3;
    if (remainder === 0) return 'lg:col-span-2';

    const lastRowStart = total - remainder;
    if (index === lastRowStart) {
      return remainder === 1
        ? 'lg:col-span-2 lg:col-start-3'
        : 'lg:col-span-2 lg:col-start-2';
    }
    return 'lg:col-span-2';
  }
}
