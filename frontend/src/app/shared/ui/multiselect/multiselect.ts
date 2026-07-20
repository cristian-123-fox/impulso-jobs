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
import { IjOption } from '@/shared/ui/forms/option';
import {
  IJ_ERROR,
  IJ_HINT,
  IJ_LABEL,
  IJ_OVERLAY_POSITIONS,
  IJ_PANEL,
  IJ_SEARCH,
  ijControlClass,
  ijOptionClass,
} from '@/shared/ui/forms/control-styles';
import { IjIcon } from '@/shared/ui/icon/icon';

/**
 * Selección múltiple con chips y búsqueda (estilo "Select2 múltiple"). CVA
 * (valor `string[]`) + CDK Overlay.
 * Uso: `<ij-multiselect label="Habilidades" [options]="skills" formControlName="skills" />`
 */
@Component({
  selector: 'ij-multiselect',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OverlayModule, A11yModule, IjIcon],
  host: { class: 'block' },
  template: `
    @if (label()) {
      <label [class]="labelClass">
        {{ label() }}@if (required()) { <span class="text-brand">*</span> }
      </label>
    }

    <div
      #trigger
      cdkOverlayOrigin
      #origin="cdkOverlayOrigin"
      [class]="boxClass() + ' cursor-pointer flex-wrap'"
      (click)="openPanel()"
    >
      @for (opt of selectedOptions(); track opt.value) {
        <span
          class="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 py-1 pl-2.5 pr-1.5 text-[12.5px] font-semibold text-brand"
        >
          {{ opt.label }}
          <button
            type="button"
            class="inline-flex h-[17px] w-[17px] items-center justify-center rounded bg-brand/15 leading-none text-brand hover:bg-brand/25"
            [attr.aria-label]="'Quitar ' + opt.label"
            (click)="remove(opt.value, $event)"
          >
            ×
          </button>
        </span>
      } @empty {
        <span class="flex-1 text-muted">{{ placeholder() || 'Selecciona…' }}</span>
      }
      <ij-icon name="chevron-down" [size]="16" class="ml-auto text-muted" />
    </div>

    <ng-template
      cdkConnectedOverlay
      [cdkConnectedOverlayOrigin]="origin"
      [cdkConnectedOverlayOpen]="open()"
      [cdkConnectedOverlayPositions]="positions"
      [cdkConnectedOverlayWidth]="panelWidth()"
      [cdkConnectedOverlayHasBackdrop]="true"
      cdkConnectedOverlayBackdropClass="cdk-overlay-transparent-backdrop"
      (backdropClick)="close()"
      (detach)="close()"
    >
      <div [class]="panelClass" cdkTrapFocus [cdkTrapFocusAutoCapture]="true">
        <input
          [class]="searchClass"
          placeholder="Buscar…"
          [value]="search()"
          (input)="onSearch($event)"
        />
        @if (!filtered().length) {
          <div class="p-3 text-[13px] text-muted">Sin resultados</div>
        }
        @for (opt of filtered(); track opt.value) {
          <div
            role="option"
            [attr.aria-selected]="isSelected(opt.value)"
            [class]="optionClass(isSelected(opt.value), false)"
            (click)="toggleOption(opt.value)"
          >
            <span class="truncate">{{ opt.label }}</span>
            @if (isSelected(opt.value)) {
              <ij-icon name="check" [size]="15" class="text-brand" />
            }
          </div>
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
export class IjMultiselect extends IjControlBase<string[]> {
  readonly options = input<readonly IjOption[]>([]);

  protected readonly labelClass = IJ_LABEL;
  protected readonly hintClass = IJ_HINT;
  protected readonly errorClass = IJ_ERROR;
  protected readonly panelClass = IJ_PANEL;
  protected readonly searchClass = IJ_SEARCH;
  protected readonly positions = IJ_OVERLAY_POSITIONS;

  protected readonly open = signal(false);
  protected readonly search = signal('');
  protected readonly panelWidth = signal(0);
  private readonly trigger = viewChild<ElementRef<HTMLElement>>('trigger');

  protected readonly selected = computed<string[]>(() => this.value() ?? []);

  protected readonly boxClass = computed(() =>
    ijControlClass({
      focused: this.open(),
      invalid: this.invalid(),
      disabled: this.disabled(),
    }),
  );

  protected readonly selectedOptions = computed(() => {
    const set = new Set(this.selected());
    return this.options().filter((o) => set.has(o.value));
  });

  protected readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    return q
      ? this.options().filter((o) => o.label.toLowerCase().includes(q))
      : this.options();
  });

  protected optionClass = ijOptionClass;

  protected isSelected(value: string): boolean {
    return this.selected().includes(value);
  }

  protected openPanel(): void {
    if (this.disabled() || this.open()) return;
    this.panelWidth.set(this.trigger()?.nativeElement.offsetWidth ?? 0);
    this.search.set('');
    this.open.set(true);
  }

  protected close(): void {
    if (this.open()) {
      this.open.set(false);
      this.markTouched();
    }
  }

  protected onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected toggleOption(value: string): void {
    const current = this.selected();
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    this.setValue(next);
  }

  protected remove(value: string, event: Event): void {
    event.stopPropagation();
    this.setValue(this.selected().filter((v) => v !== value));
  }
}
