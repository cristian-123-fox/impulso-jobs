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
            aria-label="Mes anterior"
            class="flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-line text-body hover:bg-surface"
            (click)="shift(-1)"
          >
            <ij-icon name="chevron-left" [size]="15" />
          </button>
          <span class="text-[13.5px] font-bold text-ink-900">{{ monthLabel() }}</span>
          <button
            type="button"
            aria-label="Mes siguiente"
            class="flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-line text-body hover:bg-surface"
            (click)="shift(1)"
          >
            <ij-icon name="chevron-right" [size]="15" />
          </button>
        </div>
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
    this.open.set(true);
  }

  protected close(): void {
    if (this.open()) {
      this.open.set(false);
      this.markTouched();
    }
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

  protected pick(value: string): void {
    this.setValue(value);
    this.open.set(false);
    this.markTouched();
    this.trigger()?.nativeElement.focus();
  }
}
