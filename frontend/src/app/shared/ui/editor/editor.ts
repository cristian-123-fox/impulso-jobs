import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import { IjCkeditorHost } from '@/shared/ui/editor/ckeditor-host';
import {
  IJ_ERROR,
  IJ_HINT,
  IJ_LABEL,
} from '@/shared/ui/forms/control-styles';
import { IjControlBase } from '@/shared/ui/forms/ij-control-base';

/**
 * Editor de texto enriquecido del UI Kit (T32), sobre CKEditor 5.
 *
 * Se usa como cualquier otro control del kit:
 * `<ij-editor label="Descripción" formControlName="description" />`.
 *
 * **CKEditor entra por `@defer`, no por un import normal.** Angular convierte
 * la referencia a `IjCkeditorHost` dentro del bloque diferido en un `import()`
 * dinámico, y los bloques `@defer` **no se ejecutan en el servidor**. Eso es lo
 * que mantiene `ckeditor5` —que toca `document` al cargarse— fuera del bundle
 * de servidor; con un import normal, el build falla al extraer las rutas con
 * `t.createElement is not a function`, aunque `/empresa/**` sea
 * `RenderMode.Client`.
 *
 * El `@placeholder` deja la caja ocupando su sitio mientras llega el chunk, para
 * que el formulario no dé un salto.
 */
@Component({
  selector: 'ij-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  imports: [IjCkeditorHost],
  template: `
    @if (label()) {
      <label [class]="labelClass">
        {{ label() }}@if (required()) { <span class="text-brand-strong">*</span> }
      </label>
    }

    <div [class]="boxClass()">
      @defer (on immediate) {
        <ij-ckeditor-host
          [data]="pushedData()"
          [disabled]="disabled()"
          [placeholder]="placeholder()"
          (dataChange)="onEditorData($event)"
          (focused)="focused.set(true)"
          (blurred)="onEditorBlur()"
        />
      } @placeholder {
        <div
          class="flex min-h-[264px] items-center justify-center text-[13px] text-muted"
        >
          Cargando editor…
        </div>
      }
    </div>

    @if (errorText()) {
      <p [class]="errorClass">{{ errorText() }}</p>
    } @else if (hint()) {
      <p [class]="hintClass">{{ hint() }}</p>
    }
  `,
})
export class IjEditor extends IjControlBase<string> {
  protected readonly labelClass = IJ_LABEL;
  protected readonly hintClass = IJ_HINT;
  protected readonly errorClass = IJ_ERROR;
  protected readonly focused = signal(false);

  /**
   * Lo que se **empuja** al editor, distinto de `value()`: sólo cambia cuando el
   * valor llega de fuera (precargar una vacante, restaurar un borrador). Si se
   * reenviara lo que el usuario está tecleando, CKEditor reemplazaría el
   * documento en cada pulsación y el cursor saltaría al principio.
   */
  protected readonly pushedData = signal('');

  protected readonly boxClass = computed(() => {
    const base = 'ij-editor__box overflow-hidden rounded-xl border transition-colors';
    if (this.disabled()) return `${base} border-line bg-surface opacity-70`;
    if (this.invalid()) return `${base} border-red-400 ring-2 ring-red-100`;
    if (this.focused()) return `${base} border-brand ring-2 ring-brand/15`;
    return `${base} border-line`;
  });

  override writeValue(value: string | null): void {
    super.writeValue(value);
    this.pushedData.set(value ?? '');
  }

  protected onEditorData(html: string): void {
    // `pushedData` no se toca: el editor ya tiene ese contenido.
    const normalized = isEmptyHtml(html) ? '' : html;
    this.value.set(normalized);
    this.onChange(normalized);
  }

  protected onEditorBlur(): void {
    this.focused.set(false);
    this.markTouched();
  }
}

/**
 * CKEditor nunca devuelve cadena vacía: al borrarlo todo deja `<p>&nbsp;</p>` o
 * `<p></p>`. Sin normalizarlo, un `Validators.required` daría por lleno un campo
 * visualmente vacío, y el rechazo llegaría del backend — la peor forma de
 * enterarse. Es el gemelo en cliente de `isBlank()` del backend.
 */
function isEmptyHtml(html: string): boolean {
  return (
    html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/ /g, ' ')
      .trim() === ''
  );
}
