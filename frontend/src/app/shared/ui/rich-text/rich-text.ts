import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

/**
 * Pinta el texto de una vacante, venga como HTML del editor (T32) o como texto
 * plano de antes.
 *
 * **Por qué hace falta la distinción:** las vacantes publicadas antes de T32
 * guardan saltos de línea, no marcado. Pintarlas con `[innerHTML]` las dejaría
 * como un párrafo corrido, sin separación. Al revés —pintar HTML con
 * `whitespace-pre-line`— saldrían las etiquetas a la vista. Se detecta el caso
 * y cada uno se pinta como debe, sin migrar datos.
 *
 * **Seguridad:** `[innerHTML]` de Angular sanea siempre (no se usa
 * `bypassSecurityTrust*`), y funciona igual en SSR. Es la segunda capa: el
 * backend ya guarda el HTML saneado con `sanitizeRichText`.
 *
 * `variant="check"` conserva el aspecto que tenía el portal antes de T32 —
 * lista con palomita naranja— para requisitos y responsabilidades.
 */
@Component({
  selector: 'ij-rich-text',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  styleUrl: './rich-text.css',
  template: `
    @if (isHtml()) {
      <div [class]="proseClass()" [innerHTML]="value()"></div>
    } @else if (variant() === 'check') {
      <ul [class]="proseClass()">
        @for (line of lines(); track $index) {
          <li>{{ line }}</li>
        }
      </ul>
    } @else {
      <p class="ij-prose whitespace-pre-line">{{ value() }}</p>
    }
  `,
})
export class IjRichText {
  readonly value = input<string>('');
  /**
   * `prose` para la descripción; `check` para listas (requisitos y
   * responsabilidades), que llevan la palomita del diseño original.
   */
  readonly variant = input<'prose' | 'check'>('prose');

  protected readonly proseClass = computed(() =>
    this.variant() === 'check' ? 'ij-prose ij-prose--check' : 'ij-prose',
  );

  /**
   * Heurística deliberadamente estricta: sólo se considera HTML si aparece una
   * de las etiquetas que el editor produce. Un texto plano que mencione
   * "<3 años de experiencia" no debe colarse como marcado.
   */
  protected readonly isHtml = computed(() =>
    /<(p|ul|ol|li|h3|h4|strong|em|u|s|b|i|a|br|blockquote)\b[^>]*>/i.test(
      this.value(),
    ),
  );

  /** Texto plano antiguo → una viñeta por línea, como hacía el portal. */
  protected readonly lines = computed(() =>
    this.value()
      .split(/\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0),
  );
}
