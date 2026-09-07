import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

/**
 * Encabezado de sección de marketing.
 *
 * El epígrafe naranja es **opcional** y debe usarse con cuentagotas: cuando
 * todas las secciones lo llevan deja de destacar nada y la página adquiere ese
 * ritmo de plantilla que se reconoce a la primera. En la home lo llevan dos de
 * nueve secciones; el resto se apoya sólo en el titular.
 */
@Component({
  selector: 'app-section-heading',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [class]="wrapperClass()">
      @if (eyebrow(); as eyebrow) {
        <p class="mb-2 text-[15px] font-semibold text-brand-strong">{{ eyebrow }}</p>
      }
      <h2 class="text-3xl font-bold leading-tight text-ink-900 sm:text-[36px]">
        <ng-content />
      </h2>
      @if (lead(); as lead) {
        <p [class]="leadClass()">{{ lead }}</p>
      }
    </div>
  `,
})
export class SectionHeading {
  readonly eyebrow = input<string>('');
  /** Párrafo de apoyo bajo el titular, apilado (no flotando a la derecha). */
  readonly lead = input<string>('');
  readonly align = input<'left' | 'center'>('center');

  protected readonly wrapperClass = computed(() =>
    this.align() === 'center' ? 'text-center' : 'text-left',
  );

  protected readonly leadClass = computed(() => {
    const base = 'mt-4 max-w-[62ch] text-[15px] leading-relaxed text-muted';
    return this.align() === 'center' ? `${base} mx-auto` : base;
  });
}
