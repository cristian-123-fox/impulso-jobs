import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ContactMapLocation } from '@/features/public/contact/models/contact.models';
import { IjIcon } from '@/shared/ui';

/**
 * Mapa ilustrativo de la oficina principal, inspirado en el mockup original.
 */
@Component({
  selector: 'app-contact-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjIcon],
  template: `
    <section class="px-6 pb-20 lg:px-[60px]">
      <div
        class="relative mx-auto h-[420px] max-w-[1240px] overflow-hidden rounded-[32px] bg-surface"
      >
        <div
          class="absolute inset-0 opacity-80"
          style="background-image:
            linear-gradient(to right, rgba(223, 227, 234, 0.9) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(223, 227, 234, 0.9) 1px, transparent 1px);
            background-size: 118px 100%, 100% 88px;"
        ></div>
        <div
          class="absolute -left-[5%] top-[38%] h-7 w-[110%] -rotate-6 bg-line"
        ></div>
        <div
          class="absolute -left-[5%] top-[61%] h-5 w-[110%] rotate-[4deg] bg-accent-green-soft"
        ></div>
        <div
          class="absolute left-[52%] top-[20%] h-[72%] w-[8%] rotate-[10deg] bg-line"
        ></div>

        <div
          class="absolute left-6 top-6 max-w-[250px] rounded-2xl bg-white px-5 py-4 shadow-card"
        >
          <p class="text-sm font-semibold text-ink-900">{{ location().badgeTitle }}</p>
          <p class="mt-1 text-xs leading-5 text-muted">{{ location().badgeAddress }}</p>
        </div>

        <div
          class="absolute left-1/2 top-[44%] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
        >
          <div
            class="flex h-14 w-14 items-center justify-center rounded-full bg-ink-900 text-white shadow-float"
          >
            <ij-icon name="map-pin" [size]="28" />
          </div>
          <div class="mt-4 rounded-2xl bg-white px-5 py-4 text-center shadow-card">
            <p class="text-sm font-semibold text-ink-900">{{ location().officeName }}</p>
            <p class="mt-1 text-xs leading-5 text-muted">{{ location().officeAddress }}</p>
          </div>
        </div>

        <button
          type="button"
          class="absolute bottom-5 right-5 flex h-11 w-11 items-center justify-center rounded-full bg-white text-muted shadow-card transition-colors hover:text-brand"
          aria-label="Ver mapa a pantalla completa"
        >
          <ij-icon name="plus" [size]="18" />
        </button>
      </div>
    </section>
  `,
})
export class ContactMap {
  readonly location = input.required<ContactMapLocation>();
}
