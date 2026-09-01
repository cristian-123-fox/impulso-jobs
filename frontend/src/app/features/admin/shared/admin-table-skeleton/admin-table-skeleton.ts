import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

/**
 * Skeleton de carga de los listados del back-office. Replica la silueta de las
 * tablas (cabecera + filas con avatar y badges) para que el contenido no
 * "salte" al llegar. El pulso se apaga con `prefers-reduced-motion`.
 */
@Component({
  selector: 'app-admin-table-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      role="status"
      [attr.aria-label]="label()"
      class="animate-pulse overflow-hidden rounded-2xl bg-white shadow-card motion-reduce:animate-none"
    >
      <div class="flex items-center gap-6 border-b border-line px-5 py-4">
        <span class="h-3 w-28 rounded bg-surface"></span>
        <span class="hidden h-3 w-20 rounded bg-surface sm:block"></span>
        <span class="hidden h-3 w-24 rounded bg-surface md:block"></span>
        <span class="ml-auto h-3 w-14 rounded bg-surface"></span>
      </div>
      @for (row of rowsArray(); track $index) {
        <div class="flex items-center gap-3 border-b border-line/70 px-5 py-3.5 last:border-b-0">
          <span class="h-9 w-9 flex-shrink-0 rounded-xl bg-surface"></span>
          <span class="flex min-w-0 flex-1 flex-col gap-1.5">
            <span class="h-3 w-2/5 max-w-[220px] rounded bg-surface"></span>
            <span class="h-2.5 w-1/4 max-w-[150px] rounded bg-surface"></span>
          </span>
          <span class="hidden h-6 w-20 rounded-md bg-surface sm:block"></span>
          <span class="hidden h-8 w-8 rounded-lg bg-surface md:block"></span>
        </div>
      }
      <span class="sr-only">{{ label() }}</span>
    </div>
  `,
})
export class AdminTableSkeleton {
  readonly rows = input(6);
  readonly label = input('Cargando…');

  protected readonly rowsArray = computed(() =>
    Array.from({ length: this.rows() }),
  );
}
