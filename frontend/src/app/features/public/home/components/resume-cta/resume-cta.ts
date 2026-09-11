import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { IconName, IjButton, IjIcon } from '@/shared/ui';
import { IjReveal } from '@/shared/directives/reveal';

/** Banner CTA: invita al candidato a crear su currículum en el portal. */
@Component({
  selector: 'app-resume-cta',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjIcon, IjButton, RouterLink, IjReveal, TranslocoDirective],
  template: `
    <section *transloco="let t" class="px-6 py-16 lg:px-[60px]">
      <div
        ijReveal
        class="mx-auto grid max-w-[1120px] items-center gap-0 lg:grid-cols-[0.95fr_1.05fr]"
      >
        <!--
          Columna de apoyo sin fotografía: tres razones concretas. Aquí había
          un marco de degradado esperando una foto de candidata que no existe,
          y una imagen de stock cualquiera no diría nada sobre el producto.
        -->
        <div class="hidden pb-16 pr-10 lg:block">
          <ul class="flex flex-col gap-5">
            @for (benefit of benefits; track benefit.key) {
              <li class="flex gap-4">
                <span
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-strong"
                >
                  <ij-icon [name]="benefit.icon" [size]="20" [strokeWidth]="1.8" />
                </span>
                <span>
                  <span class="block text-[15px] font-semibold text-ink-900">
                    {{ t('home.resume.' + benefit.key + '.title') }}
                  </span>
                  <span class="mt-0.5 block text-sm leading-relaxed text-muted">
                    {{ t('home.resume.' + benefit.key + '.description') }}
                  </span>
                </span>
              </li>
            }
          </ul>
        </div>

        <!--
          Panel en brand-700, no en el naranja de marca: ese daba 2.90:1 con
          texto blanco y aquí va un titular y un párrafo completos.
        -->
        <div
          class="relative rounded-xl bg-brand-700 px-8 py-12 text-white lg:-top-8 lg:px-12"
        >
          <h2 class="mb-5 text-2xl font-bold leading-snug text-white sm:text-[34px]">
            {{ t('home.resume.title') }}
          </h2>
          <p class="mb-8 max-w-[460px] text-sm leading-relaxed text-white/90">
            {{ t('home.resume.body') }}
          </p>
          <a
            ij-button
            routerLink="/auth/registro"
            variant="white"
            size="md"
            class="font-semibold"
          >
            {{ t('home.resume.cta') }}
            <ij-icon name="arrow-up" [size]="15" />
          </a>
        </div>
      </div>
    </section>
  `,
})
export class ResumeCta {
  /** Cada beneficio es un icono y una rama del diccionario (T26). */
  protected readonly benefits: readonly {
    icon: IconName;
    key: string;
  }[] = [
    { icon: 'resume', key: 'once' },
    { icon: 'history', key: 'snapshot' },
    { icon: 'eye-off', key: 'privacy' },
  ];
}
