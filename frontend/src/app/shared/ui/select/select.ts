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
 * Select con búsqueda (estilo "Select2") del UI Kit. CVA + CDK Overlay.
 * Uso: `<ij-select label="Estado" [options]="states" formControlName="state" />`
 */
@Component({
  selector: 'ij-select',
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
      aria-haspopup="listbox"
      (click)="toggle()"
      (keydown)="onTriggerKeydown($event)"
      (blur)="markTouched()"
    >
      <span class="flex-1 truncate" [class]="selectedLabel() ? 'text-ink-900' : 'text-muted'">
        {{ selectedLabel() || placeholder() || 'Selecciona…' }}
      </span>
      <ij-icon name="chevron-down" [size]="16" class="text-muted" />
    </button>

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
      <div [class]="panelClass" cdkTrapFocus [cdkTrapFocusAutoCapture]="true" (keydown)="onPanelKeydown($event)">
        @if (searchable()) {
          <input
            [class]="searchClass"
            [placeholder]="'Buscar…'"
            [value]="search()"
            (input)="onSearch($event)"
          />
        }
        @if (!filtered().length) {
          <div class="p-3 text-[13px] text-muted">Sin resultados</div>
        }
        @for (opt of filtered(); track opt.value; let i = $index) {
          <div
            role="option"
            [attr.aria-selected]="opt.value === value()"
            [class]="optionClass(opt.value === value(), i === highlight())"
            (click)="select(opt.value)"
            (mouseenter)="highlight.set(i)"
          >
            <span class="truncate">{{ opt.label }}</span>
            @if (opt.value === value()) {
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
export class IjSelect extends IjControlBase<string> {
  readonly options = input<readonly IjOption[]>([]);
  readonly searchable = input<boolean>(true);

  protected readonly labelClass = IJ_LABEL;
  protected readonly hintClass = IJ_HINT;
  protected readonly errorClass = IJ_ERROR;
  protected readonly panelClass = IJ_PANEL;
  protected readonly searchClass = IJ_SEARCH;
  protected readonly positions = IJ_OVERLAY_POSITIONS;

  protected readonly open = signal(false);
  protected readonly search = signal('');
  protected readonly highlight = signal(0);
  protected readonly panelWidth = signal(0);
  private readonly trigger = viewChild<ElementRef<HTMLElement>>('trigger');

  protected readonly boxClass = computed(() =>
    ijControlClass({
      focused: this.open(),
      invalid: this.invalid(),
      disabled: this.disabled(),
    }),
  );

  protected readonly selectedLabel = computed(
    () => this.options().find((o) => o.value === this.value())?.label ?? '',
  );

  protected readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    return q
      ? this.options().filter((o) => o.label.toLowerCase().includes(q))
      : this.options();
  });

  protected optionClass = ijOptionClass;

  protected toggle(): void {
    this.open() ? this.close() : this.openPanel();
  }

  protected openPanel(): void {
    if (this.disabled()) return;
    this.panelWidth.set(this.trigger()?.nativeElement.offsetWidth ?? 0);
    this.search.set('');
    this.highlight.set(0);
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
    this.highlight.set(0);
  }

  protected select(value: string): void {
    this.setValue(value);
    this.open.set(false);
    this.markTouched();
    this.trigger()?.nativeElement.focus();
  }

  protected onTriggerKeydown(event: KeyboardEvent): void {
    if (!this.open() && (event.key === 'ArrowDown' || event.key === 'Enter')) {
      event.preventDefault();
      this.openPanel();
    }
  }

  protected onPanelKeydown(event: KeyboardEvent): void {
    const items = this.filtered();
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.highlight.update((i) => Math.min(i + 1, items.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.highlight.update((i) => Math.max(i - 1, 0));
        break;
      case 'Enter': {
        event.preventDefault();
        const opt = items[this.highlight()];
        if (opt) this.select(opt.value);
        break;
      }
      case 'Escape':
        event.preventDefault();
        this.close();
        this.trigger()?.nativeElement.focus();
        break;
    }
  }
}
