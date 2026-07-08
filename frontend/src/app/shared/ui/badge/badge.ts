import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { TONE_SOFT, Tone } from '../tone';

/**
 * Etiqueta compacta (badge) del UI Kit, con tono de acento configurable.
 * Uso: `<ij-badge tone="green">New</ij-badge>`
 */
@Component({
  selector: 'ij-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: { '[class]': 'classes()' },
})
export class IjBadge {
  readonly tone = input<Tone>('brand');

  protected readonly classes = computed(
    () =>
      `inline-block rounded-md px-3 py-1.5 text-[11px] font-semibold ${TONE_SOFT[this.tone()]}`,
  );
}
