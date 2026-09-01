import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IjIcon } from '@/shared/ui';

/**
 * Estado de error de los listados del back-office: mensaje + reintento. El
 * padre decide qué recargar al recibir `retry`.
 */
@Component({
  selector: 'app-admin-error',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjIcon],
  template: `
    <div
      role="alert"
      class="flex flex-col items-center gap-3 rounded-2xl bg-white px-6 py-12 text-center shadow-card"
    >
      <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
        <ij-icon name="alert-triangle" [size]="22" [strokeWidth]="1.9" />
      </span>
      <p class="text-[13.5px] font-semibold text-ink-900">{{ message() }}</p>
      <button
        type="button"
        class="mt-1 rounded-xl border border-line bg-white px-4 py-2.5 text-[13.5px] font-bold text-body transition-colors hover:bg-surface active:translate-y-[1px]"
        (click)="retry.emit()"
      >
        Reintentar
      </button>
    </div>
  `,
})
export class AdminError {
  readonly message = input.required<string>();
  readonly retry = output<void>();
}
