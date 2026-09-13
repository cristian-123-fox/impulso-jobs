import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  ViewEncapsulation,
} from '@angular/core';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import type { ChangeEvent } from '@ckeditor/ckeditor5-angular';
import {
  Autoformat,
  BlockQuote,
  Bold,
  ClassicEditor,
  type EditorConfig,
  Essentials,
  Heading,
  Italic,
  Link,
  List,
  Paragraph,
  PasteFromOffice,
  Strikethrough,
  Underline,
} from 'ckeditor5';

/**
 * Instancia real de CKEditor 5. **Vive en su propio archivo, separado de
 * `IjEditor`, por una razón concreta:** es el único sitio donde se importa
 * `ckeditor5`, y `IjEditor` sólo lo referencia dentro de un `@defer`. Así el
 * compilador de Angular convierte ese import en dinámico y el paquete **nunca
 * se evalúa en el servidor**.
 *
 * Sin esta separación, el build falla con `t.createElement is not a function`
 * al extraer las rutas: CKEditor toca `document` al cargarse, y la extracción
 * de rutas de Angular ejecuta los módulos en Node aunque la ruta sea
 * `RenderMode.Client`.
 *
 * `ViewEncapsulation.None` es obligatorio: CKEditor monta la barra, los globos
 * y los menús en `document.body`, fuera del árbol del componente, donde los
 * atributos `_ngcontent` de la encapsulación emulada no llegan.
 */
@Component({
  selector: 'ij-ckeditor-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'block' },
  imports: [CKEditorModule],
  styleUrl: './ckeditor-host.css',
  template: `
    <ckeditor
      [editor]="Editor"
      [config]="config()"
      [data]="data()"
      [disabled]="disabled()"
      (change)="onChange($event)"
      (focus)="focused.emit()"
      (blur)="blurred.emit()"
    />
  `,
})
export class IjCkeditorHost {
  /**
   * Contenido que se **empuja** al editor. Sólo debe cambiar cuando el valor
   * viene de fuera (precarga, borrador restaurado): reenviar lo que el usuario
   * está escribiendo haría que CKEditor reemplazase el documento en cada tecla
   * y el cursor saltaría al principio.
   */
  readonly data = input<string>('');
  readonly disabled = input<boolean>(false);
  readonly placeholder = input<string>('');

  readonly dataChange = output<string>();
  readonly focused = output<void>();
  readonly blurred = output<void>();

  protected readonly Editor = ClassicEditor;

  /**
   * **El formato permitido es corto a propósito.** Negrita, cursiva, subrayado,
   * tachado, dos niveles de título, listas, cita y enlace — nada de tablas,
   * imágenes ni colores. Lo que el editor no ofrezca, el saneador del backend
   * (`sanitizeRichText`) lo tira igual; tenerlos alineados evita que la empresa
   * escriba algo que desaparece al guardar y que el detalle público se
   * descuadre con marcado que su maqueta no espera.
   */
  protected readonly config = (): EditorConfig => ({
    // ⚠️ Licencia GPL: obliga a que la aplicación que lo incrusta sea GPL.
    // Impulso Jobs es un producto comercial, así que es una deuda legal
    // consciente — al contratar la licencia de CKEditor se cambia esta cadena
    // por la clave comprada. Anotado en TASKS.md · T32.
    licenseKey: 'GPL',
    plugins: [
      Essentials,
      Paragraph,
      Autoformat,
      Bold,
      Italic,
      Underline,
      Strikethrough,
      Heading,
      List,
      Link,
      BlockQuote,
      // Sin esto, pegar desde Word arrastra marcado de Office que el saneador
      // acaba tirando entero: el usuario pega y ve cómo se pierde el texto.
      PasteFromOffice,
    ],
    toolbar: [
      'undo',
      'redo',
      '|',
      'heading',
      '|',
      'bold',
      'italic',
      'underline',
      'strikethrough',
      '|',
      'bulletedList',
      'numberedList',
      '|',
      'link',
      'blockQuote',
    ],
    heading: {
      options: [
        { model: 'paragraph', title: 'Párrafo', class: 'ck-heading_paragraph' },
        // Sólo h3/h4: el detalle público ya usa h1 para el puesto y h2 para los
        // títulos de sección. Dejar h1 aquí rompería la jerarquía del SEO.
        {
          model: 'heading3',
          view: 'h3',
          title: 'Título',
          class: 'ck-heading_heading3',
        },
        {
          model: 'heading4',
          view: 'h4',
          title: 'Subtítulo',
          class: 'ck-heading_heading4',
        },
      ],
    },
    link: {
      addTargetToExternalLinks: true,
      defaultProtocol: 'https://',
    },
    placeholder: this.placeholder(),
  });

  protected onChange(event: ChangeEvent): void {
    this.dataChange.emit(event.editor.getData());
  }
}
