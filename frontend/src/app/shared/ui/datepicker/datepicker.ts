import { A11yModule } from '@angular/cdk/a11y';
import { OverlayModule } from '@angular/cdk/overlay';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { IjControlBase } from '@/shared/ui/forms/ij-control-base';
import {
  IJ_ERROR,
  IJ_HINT,
  IJ_LABEL,
  IJ_OVERLAY_POSITIONS,
  ijControlClass,
} from '@/shared/ui/forms/control-styles';
import { IjIcon } from '@/shared/ui/icon/icon';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const MSHORT = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

interface DayCell {
  readonly blank: boolean;
  readonly label: string;
  readonly iso?: string;
  readonly selected?: boolean;
  readonly today?: boolean;
  readonly disabled?: boolean;
}

function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * Datepicker del UI Kit: calendario propio (sin dependencias externas). CVA
 * (valor ISO `yyyy-mm-dd`) + CDK Overlay. Semana de lunes a domingo.
 * Uso: `<ij-datepicker label="Fecha" formControlName="birthDate" [max]="hoy" />`
 */
@Component({
  selector: 'ij-datepicker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OverlayModule, A11yModule, IjIcon],
  host: { class: 'block' },
  template: `
    @if (label()) {
      <label [class]="labelClass">
        {{ label() }}@if (required()) { <span class="text-brand">*</span> }
      </label>
    }

    <button
      #trigger
      type="button"
      cdkOverlayOrigin
      #origin="cdkOverlayOrigin"
      [class]="boxClass() + ' cursor-pointer text-left'"
      [disabled]="disabled()"
      [attr.aria-expanded]="open()"
      (click)="toggle()"
      (blur)="markTouched()"
    >
      <ij-icon name="calendar" [size]="17" class="text-muted" />
      <span class="flex-1" [class]="display() ? 'text-ink-900' : 'text-muted'">
        {{ display() || placeholder() || 'Selecciona una fecha' }}
      </span>
    </button>

    <ng-template
      cdkConnectedOverlay
      [cdkConnectedOverlayOrigin]="origin"
      [cdkConnectedOverlayOpen]="open()"
      [cdkConnectedOverlayPositions]="positions"
      [cdkConnectedOverlayHasBackdrop]="true"
      cdkConnectedOverlayBackdropClass="cdk-overlay-transparent-backdrop"
      (backdropClick)="close()"
      (detach)="close()"
    >
      <div
        class="w-[300px] rounded-xl border border-line bg-white p-3.5 shadow-float"
        cdkTrapFocus
        [cdkTrapFocusAutoCapture]="true"
      >
        <div class="mb-2.5 flex items-center justify-between">
          <button
            type="button"
            [attr.aria-label]="view() === 'days' ? 'Mes anterior' : 'Anterior'"
            class="flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-line text-body hover:bg-surface"
            (click)="navigate(-1)"
          >
            <ij-icon name="chevron-left" [size]="15" />
          </button>
          <button
            type="button"
            aria-label="Elegir año"
            class="rounded-lg px-2.5 py-1 text-[13.5px] font-bold text-ink-900 transition-colors hover:bg-surface hover:text-brand"
            (click)="onHeaderClick()"
          >
            {{ headerLabel() }}
          </button>
          <button
            type="button"
            [attr.aria-label]="view() === 'days' ? 'Mes siguiente' : 'Siguiente'"
            class="flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-line text-body hover:bg-surface"
            (click)="navigate(1)"
          >
            <ij-icon name="chevron-right" [size]="15" />
          </button>
        </div>

        @switch (view()) {
          @case ('years') {
            <div class="grid grid-cols-3 gap-1">
              @for (y of yearCells(); track y.year) {
                <button
                  type="button"
                  class="flex h-[38px] items-center justify-center rounded-lg text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-30"
                  [class]="y.selected ? 'bg-brand font-bold text-white' : 'font-medium text-ink-900 hover:bg-surface'"
                  [disabled]="y.disabled"
                  (click)="pickYear(y.year)"
                >
                  {{ y.year }}
                </button>
              }
            </div>
          }
          @case ('months') {
            <div class="grid grid-cols-3 gap-1">
              @for (m of monthCells(); track m.index) {
                <button
                  type="button"
                  class="flex h-[38px] items-center justify-center rounded-lg text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-30"
                  [class]="m.selected ? 'bg-brand font-bold text-white' : 'font-medium text-ink-900 hover:bg-surface'"
                  [disabled]="m.disabled"
                  (click)="pickMonth(m.index)"
                >
                  {{ m.label }}
                </button>
              }
            </div>
          }
          @default {
            <div class="mb-1 grid grid-cols-7 gap-0.5">
              @for (w of weekdays; track w) {
                <span class="py-1 text-center text-[11px] font-bold text-muted">{{ w }}</span>
              }
            </div>
            <div class="grid grid-cols-7 gap-0.5">
              @for (c of cells(); track $index) {
                @if (c.blank) {
                  <span></span>
                } @else {
                  <button
                    type="button"
                    class="flex h-[34px] items-center justify-center rounded-lg text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-30"
                    [class]="dayClass(c)"
                    [disabled]="c.disabled"
                    (click)="pick(c.iso!)"
                  >
                    {{ c.label }}
                  </button>
                }
              }
            </div>
          }
        }
      </div>
    </ng-template>

    @if (errorText()) {
      <p [class]="errorClass">{{ errorText() }}</p>
    } @else if (hint()) {
      <p [class]="hintClass">{{ hint() }}</p>
    }
  `,
})
export class IjDatepicker extends IjControlBase<string> {
  readonly min = input<string | null>(null);
  readonly max = input<string | null>(null);

  protected readonly labelClass = IJ_LABEL;
  protected readonly hintClass = IJ_HINT;
  protected readonly errorClass = IJ_ERROR;
  protected readonly positions = IJ_OVERLAY_POSITIONS;
  protected readonly weekdays = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];

  protected readonly open = signal(false);
  private readonly today = new Date();
  protected readonly viewYear = signal(this.today.getFullYear());
  protected readonly viewMonth = signal(this.today.getMonth());
  /** 'days' es el calendario; 'years'/'months' son los pasos del salto de año. */
  protected readonly view = signal<'days' | 'months' | 'years'>('days');
  /** Primer año de la página visible de la grilla de años (12 por página). */
  protected readonly yearBase = signal(0);
  private readonly trigger = viewChild<ElementRef<HTMLElement>>('trigger');

  protected readonly boxClass = computed(() =>
    ijControlClass({
      focused: this.open(),
      invalid: this.invalid(),
      disabled: this.disabled(),
    }),
  );

  protected readonly monthLabel = computed(
    () => `${MONTHS[this.viewMonth()]} ${this.viewYear()}`,
  );

  protected readonly headerLabel = computed(() => {
    switch (this.view()) {
      case 'years':
        return `${this.yearBase()} – ${this.yearBase() + 11}`;
      case 'months':
        return String(this.viewYear());
      default:
        return this.monthLabel();
    }
  });

  protected readonly yearCells = computed(() => {
    const base = this.yearBase();
    const minYear = this.boundYear(this.min());
    const maxYear = this.boundYear(this.max());
    return Array.from({ length: 12 }, (_, i) => {
      const year = base + i;
      return {
        year,
        selected: year === this.viewYear(),
        disabled:
          (minYear !== null && year < minYear) ||
          (maxYear !== null && year > maxYear),
      };
    });
  });

  protected readonly monthCells = computed(() => {
    const y = this.viewYear();
    const min = this.min();
    const max = this.max();
    return MSHORT.map((label, index) => {
      const lastDay = new Date(y, index + 1, 0).getDate();
      return {
        label,
        index,
        selected: index === this.viewMonth(),
        // Un mes se puede elegir si al menos un día suyo cae dentro de min/max.
        disabled:
          (!!min && iso(y, index, lastDay) < min) ||
          (!!max && iso(y, index, 1) > max),
      };
    });
  });

  protected readonly display = computed(() => {
    const value = this.value();
    if (!value) return '';
    const [y, m, d] = value.split('-');
    return `${parseInt(d, 10)} ${MSHORT[parseInt(m, 10) - 1]} ${y}`;
  });

  protected readonly cells = computed<DayCell[]>(() => {
    const y = this.viewYear();
    const m = this.viewMonth();
    const startIdx = (new Date(y, m, 1).getDay() + 6) % 7;
    const days = new Date(y, m + 1, 0).getDate();
    const selected = this.value();
    const todayIso = iso(
      this.today.getFullYear(),
      this.today.getMonth(),
      this.today.getDate(),
    );
    const min = this.min();
    const max = this.max();

    const cells: DayCell[] = [];
    for (let i = 0; i < startIdx; i++) cells.push({ blank: true, label: '' });
    for (let d = 1; d <= days; d++) {
      const value = iso(y, m, d);
      cells.push({
        blank: false,
        label: String(d),
        iso: value,
        selected: selected === value,
        today: value === todayIso,
        disabled: (!!min && value < min) || (!!max && value > max),
      });
    }
    return cells;
  });

  protected dayClass(c: DayCell): string {
    if (c.selected) return 'bg-brand font-bold text-white';
    if (c.today) return 'font-bold text-brand hover:bg-surface';
    return 'font-medium text-ink-900 hover:bg-surface';
  }

  protected toggle(): void {
    this.open() ? this.close() : this.openPanel();
  }

  protected openPanel(): void {
    if (this.disabled()) return;
    const value = this.value();
    if (value) {
      const [y, m] = value.split('-');
      this.viewYear.set(parseInt(y, 10));
      this.viewMonth.set(parseInt(m, 10) - 1);
    }
    this.view.set('days');
    this.open.set(true);
  }

  protected close(): void {
    if (this.open()) {
      this.open.set(false);
      this.markTouched();
    }
  }

  protected onHeaderClick(): void {
    if (this.view() !== 'years') {
      this.yearBase.set(this.viewYear() - (this.viewYear() % 12));
      this.view.set('years');
    }
  }

  /** Las flechas navegan según la vista: mes, año o página de 12 años. */
  protected navigate(delta: number): void {
    switch (this.view()) {
      case 'years':
        this.yearBase.set(this.yearBase() + delta * 12);
        break;
      case 'months':
        this.viewYear.set(this.viewYear() + delta);
        break;
      default:
        this.shift(delta);
    }
  }

  protected pickYear(year: number): void {
    this.viewYear.set(year);
    this.view.set('months');
  }

  protected pickMonth(index: number): void {
    this.viewMonth.set(index);
    this.view.set('days');
  }

  protected shift(delta: number): void {
    let m = this.viewMonth() + delta;
    let y = this.viewYear();
    if (m < 0) {
      m = 11;
      y--;
    } else if (m > 11) {
      m = 0;
      y++;
    }
    this.viewMonth.set(m);
    this.viewYear.set(y);
  }

  private boundYear(bound: string | null): number | null {
    if (!bound) return null;
    const year = parseInt(bound.slice(0, 4), 10);
    return Number.isNaN(year) ? null : year;
  }

  protected pick(value: string): void {
    this.setValue(value);
    this.open.set(false);
    this.markTouched();
    this.trigger()?.nativeElement.focus();
  }
}
