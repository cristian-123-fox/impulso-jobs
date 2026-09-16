import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
} from '@angular/core';

/**
 * Avatar de una persona o una empresa: la imagen si la hay y carga, y si no
 * las iniciales del nombre.
 *
 * El respaldo **no es sólo para cuando no hay foto**: también cubre que la URL
 * guardada ya no sirva. Pasa más de lo que parece —las imágenes se persisten
 * absolutas (T23), así que un cambio de host deja filas apuntando al anterior
 * hasta que se corre `uploads:rehost`—, y sin esto el hueco se llena con el
 * icono de imagen rota del navegador, que es peor que unas iniciales.
 *
 * El tamaño, el radio y los colores los pone quien lo usa, con sus clases
 * sobre el host; aquí sólo se centra el contenido y se recorta lo que sobre.
 *
 * Uso: `<ij-avatar class="h-9 w-9 rounded-xl bg-brand-50 text-brand-strong"
 *        [src]="user.photoUrl" [name]="user.displayName" />`
 */
@Component({
  selector: 'ij-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'inline-flex flex-shrink-0 items-center justify-center overflow-hidden',
    '[attr.aria-hidden]': 'true',
  },
  template: `
    @if (src() && !failed()) {
      <img
        [src]="src()"
        alt=""
        class="h-full w-full object-cover"
        (error)="failed.set(true)"
      />
    } @else {
      <span>{{ initials() }}</span>
    }
  `,
})
export class IjAvatar {
  readonly src = input<string | null>(null);
  /** Nombre o correo del que salen las iniciales. */
  readonly name = input<string>('');
  /** Qué pintar cuando no hay nombre del que sacar iniciales. */
  readonly fallback = input<string>('?');

  /**
   * Se reinicia al cambiar de imagen: si no, sustituir una foto rota por otra
   * buena seguiría enseñando las iniciales hasta recargar la página.
   */
  protected readonly failed = linkedSignal<string | null, boolean>({
    source: () => this.src(),
    computation: () => false,
  });

  protected readonly initials = computed(() => {
    const parts = this.name()
      .split(/[\s@._-]+/)
      .filter(Boolean);
    const first = parts[0]?.[0];
    if (!first) return this.fallback();
    return (first + (parts[1]?.[0] ?? '')).toUpperCase();
  });
}
