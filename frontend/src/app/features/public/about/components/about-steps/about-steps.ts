import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IjIcon, TONE_SOFT } from '@/shared/ui';
import { AboutStep } from '@/features/public/about/models/about.models';

@Component({
  selector: 'app-about-steps',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjIcon],
  template: `
    <section class="px-6 py-[90px] lg:px-[60px]">
      <div
        class="mx-auto grid max-w-[1120px] items-center gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-[60px]"
      >
        <div>
          <p class="mb-[10px] text-[15px] font-semibold text-brand">
            Cómo funciona
          </p>
          <h2 class="mb-[30px] text-[40px] font-bold leading-[1.2] text-ink-900">
            Sigue nuestros pasos
            <br />
            y te ayudaremos.
          </h2>

          <div class="flex flex-col gap-4">
            @for (bullet of bullets(); track bullet) {
              <div class="flex items-center gap-3">
                <span
                  class="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-brand text-white"
                >
                  <ij-icon name="check" [size]="13" [strokeWidth]="3" />
                </span>
                <span class="text-[15px] font-medium text-body">{{ bullet }}</span>
              </div>
            }
          </div>
        </div>

        <div class="grid gap-[26px] sm:grid-cols-2">
          @for (step of steps(); track step.num) {
            <article
              [class]="articleClasses(step)"
            >
              <div
                class="absolute right-5 top-[14px] text-5xl font-extrabold leading-none"
                [class]="numClasses(step)"
              >
                {{ step.num }}
              </div>

              <div
                class="mb-[18px] flex h-14 w-14 items-center justify-center rounded-[10px] bg-white shadow-float"
                [class]="iconTone(step)"
              >
                <ij-icon [name]="step.icon" [size]="24" [strokeWidth]="1.9" />
              </div>

              <h3 class="mb-3 max-w-[160px] text-[17px] font-semibold leading-[1.3] text-ink-900">
                {{ step.title }}
              </h3>
              <p class="text-[13px] leading-[1.6] text-body">
                {{ step.description }}
              </p>
            </article>
          }
        </div>
      </div>
    </section>
  `,
})
export class AboutSteps {
  readonly bullets = input.required<readonly string[]>();
  readonly steps = input.required<readonly AboutStep[]>();

  protected articleClasses(step: AboutStep): string {
    return [
      'relative rounded-xl px-6 pb-[30px] pt-[26px]',
      step.shifted ? 'lg:translate-y-6' : '',
      this.cardTone(step),
    ].join(' ');
  }

  private cardTone(step: AboutStep): string {
    switch (step.tone) {
      case 'amber':
        return 'bg-accent-amber-soft';
      case 'pink':
        return 'bg-accent-pink-soft';
      case 'green':
        return 'bg-accent-green-soft';
      default:
        return 'bg-brand-50';
    }
  }

  protected numClasses(step: AboutStep): string {
    switch (step.tone) {
      case 'amber':
        return 'text-accent-amber/40';
      case 'pink':
        return 'text-accent-pink/35';
      case 'green':
        return 'text-accent-green/40';
      default:
        return 'text-brand/20';
    }
  }

  protected iconTone(step: AboutStep): string {
    return TONE_SOFT[step.tone];
  }
}
