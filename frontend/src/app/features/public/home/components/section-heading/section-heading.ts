import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

/**
 * Encabezado de sección de marketing: epígrafe naranja + título.
 * El título se proyecta como contenido para permitir saltos de línea.
 */
@Component({
  selector: 'app-section-heading',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [class]="wrapperClass()">
      <p class="mb-2 text-[15px] font-semibold text-brand">{{ eyebrow() }}</p>
      <h2 class="text-3xl font-bold leading-tight text-ink-900 sm:text-[36px]">
        <ng-content />
      </h2>
    </div>
  `,
})
export class SectionHeading {
  readonly eyebrow = input.required<string>();
  readonly align = input<'left' | 'center'>('center');

  protected readonly wrapperClass = computed(() =>
    this.align() === 'center' ? 'text-center' : 'text-left',
  );
}
