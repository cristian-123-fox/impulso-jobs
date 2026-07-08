import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconName, IjIcon } from '@/shared/ui';

/**
 * Marco de imagen placeholder. Ocupa el 100% de su contenedor (el tamaño lo
 * define el padre) y muestra un degradado suave con un icono. Se reemplazará
 * por `<img>` reales cuando existan los assets definitivos.
 */
@Component({
  selector: 'app-media-frame',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjIcon],
  template: `
    <div
      class="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-accent-blue-soft via-surface to-brand-50 text-muted"
    >
      <ij-icon [name]="icon()" [size]="34" [strokeWidth]="1.5" />
      @if (label()) {
        <span class="text-xs font-medium">{{ label() }}</span>
      }
    </div>
  `,
})
export class MediaFrame {
  readonly icon = input<IconName>('image');
  readonly label = input<string>('');
}
