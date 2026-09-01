import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconName, IjIcon } from '@/shared/ui';

/**
 * Estado vacío de los listados del back-office: icono + mensaje + pista de
 * cómo poblarlo. Se usa dentro del `@empty` de las tablas (celda `colspan`).
 */
@Component({
  selector: 'app-admin-empty',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjIcon],
  template: `
    <div class="flex flex-col items-center gap-2.5 px-6 py-12 text-center">
      <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-surface text-muted">
        <ij-icon [name]="icon()" [size]="22" [strokeWidth]="1.9" />
      </span>
      <p class="text-[13.5px] font-semibold text-ink-900">{{ message() }}</p>
      @if (hint()) {
        <p class="max-w-[420px] text-[12.5px] text-muted">{{ hint() }}</p>
      }
      <ng-content />
    </div>
  `,
})
export class AdminEmpty {
  readonly icon = input<IconName>('search');
  readonly message = input.required<string>();
  readonly hint = input('');
}
