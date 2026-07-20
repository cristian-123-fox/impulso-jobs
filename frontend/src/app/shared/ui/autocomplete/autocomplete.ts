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
  IJ_NATIVE_INPUT,
  IJ_OVERLAY_POSITIONS,
  IJ_PANEL,
  ijControlClass,
  ijOptionClass,
} from '@/shared/ui/forms/control-styles';

/**
 * Autocomplete / typeahead del UI Kit: campo de texto libre con sugerencias.
 * CVA (valor `string`) + CDK Overlay. El valor es lo que el usuario escribe;
 * las sugerencias solo ayudan a completarlo.
 * Uso: `<ij-autocomplete label="Ciudad" [suggestions]="ciudades" formControlName="ciudad" />`
 */
@Component({
  selector: 'ij-autocomplete',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OverlayModule],
  host: { class: 'block' },
  template: `
    @if (label()) {
      <label [class]="labelClass" [attr.for]="controlId">
        {{ label() }}@if (required()) { <span class="text-brand">*</span> }
      </label>
    }

    <div #trigger cdkOverlayOrigin #origin="cdkOverlayOrigin" [class]="boxClass()">
      <input
        [id]="controlId"
        [class]="nativeClass"
        role="combobox"
        [attr.aria-expanded]="showPanel()"
        autocomplete="off"
        [value]="value() ?? ''"
        [placeholder]="placeholder()"
        [disabled]="disabled()"
        (input)="onInput($event)"
        (focus)="onFocus()"
        (blur)="markTouched()"
        (keydown)="onKeydown($event)"
      />
    </div>

    <ng-template
      cdkConnectedOverlay
      [cdkConnectedOverlayOrigin]="origin"
      [cdkConnectedOverlayOpen]="showPanel()"
      [cdkConnectedOverlayPositions]="positions"
      [cdkConnectedOverlayWidth]="panelWidth()"
      [cdkConnectedOverlayHasBackdrop]="true"
      cdkConnectedOverlayBackdropClass="cdk-overlay-transparent-backdrop"
      (backdropClick)="open.set(false)"
      (detach)="open.set(false)"
    >
      <div [class]="panelClass">
        @for (opt of filtered(); track opt; let i = $index) {
          <div
            role="option"
            [class]="optionClass(false, i === highlight())"
            (mousedown)="select(opt, $event)"
            (mouseenter)="highlight.set(i)"
          >
            {{ opt }}
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
export class IjAutocomplete extends IjControlBase<string> {
  readonly suggestions = input<readonly string[]>([]);
  readonly maxResults = input<number>(8);

  protected readonly labelClass = IJ_LABEL;
  protected readonly hintClass = IJ_HINT;
  protected readonly errorClass = IJ_ERROR;
  protected readonly nativeClass = IJ_NATIVE_INPUT;
  protected readonly panelClass = IJ_PANEL;
  protected readonly positions = IJ_OVERLAY_POSITIONS;

  protected readonly open = signal(false);
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

  protected readonly filtered = computed(() => {
    const q = (this.value() ?? '').trim().toLowerCase();
    const src = this.suggestions();
    const list = q
      ? src.filter((s) => s.toLowerCase().includes(q) && s.toLowerCase() !== q)
      : src;
    return list.slice(0, this.maxResults());
  });

  protected readonly showPanel = computed(
    () => this.open() && this.filtered().length > 0,
  );

  protected optionClass = ijOptionClass;

  protected onInput(event: Event): void {
    this.setValue((event.target as HTMLInputElement).value);
    this.highlight.set(0);
    this.openPanel();
  }

  protected onFocus(): void {
    this.openPanel();
  }

  protected openPanel(): void {
    if (this.disabled()) return;
    this.panelWidth.set(this.trigger()?.nativeElement.offsetWidth ?? 0);
    this.open.set(true);
  }

  protected select(value: string, event: Event): void {
    event.preventDefault(); // conserva el foco del input
    this.setValue(value);
    this.open.set(false);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!this.showPanel()) return;
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
        const opt = items[this.highlight()];
        if (opt) {
          event.preventDefault();
          this.setValue(opt);
          this.open.set(false);
        }
        break;
      }
      case 'Escape':
        this.open.set(false);
        break;
    }
  }
}
