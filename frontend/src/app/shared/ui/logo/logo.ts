import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

/**
 * Marca de Impulso Jobs: isotipo (pastilla naranja con punto) + wordmark.
 * `variant` controla el color del texto según el fondo (claro/oscuro).
 */
@Component({
  selector: 'ij-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex items-center gap-2.5' },
  template: `
    <span
      class="relative block w-[26px] h-8 rounded-t-[13px] rounded-b bg-brand"
      aria-hidden="true"
    >
      <span
        class="absolute left-1/2 top-[6px] block h-2 w-2 -translate-x-1/2 rounded-full bg-white"
      ></span>
    </span>
    <span [class]="wordmarkClass()">Impulso<span class="text-brand">Jobs</span></span>
  `,
})
export class IjLogo {
  readonly variant = input<'dark' | 'light'>('dark');
  readonly size = input<'md' | 'sm'>('md');

  protected readonly wordmarkClass = computed(() => {
    const color = this.variant() === 'light' ? 'text-white' : 'text-ink-900';
    const scale = this.size() === 'sm' ? 'text-xl' : 'text-2xl';
    return `font-bold tracking-tight ${scale} ${color}`;
  });
}
