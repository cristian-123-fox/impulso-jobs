import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IjReveal } from '@/shared/directives/reveal';
import { AboutFact } from '@/features/public/about/models/about.models';

/**
 * Cobertura, en cifras que se pueden comprobar: el número de áreas y de
 * estados sale de los catálogos, no de una promesa de marketing.
 */
@Component({
  selector: 'app-about-facts',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjReveal],
  template: `
    <section class="bg-surface px-6 py-16 lg:px-[60px]">
      <dl class="mx-auto grid max-w-[1000px] gap-10 sm:grid-cols-3">
        @for (fact of facts(); track fact.label; let i = $index) {
          <div ijReveal [revealDelay]="i * 90">
            <dt class="text-[13px] font-semibold text-muted">{{ fact.label }}</dt>
            <dd>
              <span class="mt-1 block text-[44px] font-bold leading-none text-brand-strong">
                {{ fact.value }}
              </span>
              <span class="mt-3 block max-w-[34ch] text-sm leading-relaxed text-muted">
                {{ fact.detail }}
              </span>
            </dd>
          </div>
        }
      </dl>
    </section>
  `,
})
export class AboutFacts {
  readonly facts = input.required<readonly AboutFact[]>();
}
