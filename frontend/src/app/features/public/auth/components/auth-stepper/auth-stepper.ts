import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IjIcon } from '@/shared/ui';

/** Cabecera de pasos para los formularios de registro (presentacional). */
@Component({
  selector: 'app-auth-stepper',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjIcon],
  template: `
    <ol class="mb-7 flex items-center gap-2">
      @for (label of steps(); track $index) {
        <li class="flex flex-1 items-center gap-2">
          <span [class]="dotClass($index)">
            @if ($index < current()) {
              <ij-icon name="check" [size]="15" [strokeWidth]="2.8" />
            } @else {
              {{ $index + 1 }}
            }
          </span>
          <span
            class="hidden text-[12.5px] font-semibold sm:block"
            [class]="$index <= current() ? 'text-ink-900' : 'text-muted'"
          >
            {{ label }}
          </span>
          @if ($index < steps().length - 1) {
            <span class="h-px flex-1 bg-line"></span>
          }
        </li>
      }
    </ol>
  `,
})
export class AuthStepper {
  readonly steps = input.required<string[]>();
  readonly current = input.required<number>();

  protected dotClass(index: number): string {
    const base =
      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12.5px] font-bold transition-colors ';
    if (index < this.current()) return base + 'bg-brand text-white';
    if (index === this.current())
      return base + 'bg-brand text-white ring-4 ring-brand/15';
    return base + 'bg-surface text-muted';
  }
}
