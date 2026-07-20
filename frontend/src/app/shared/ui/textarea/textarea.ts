import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { IjControlBase } from '@/shared/ui/forms/ij-control-base';
import {
  IJ_ERROR,
  IJ_HINT,
  IJ_LABEL,
  ijControlClass,
} from '@/shared/ui/forms/control-styles';

/**
 * Textarea del UI Kit (Tailwind + brand). CVA vía `IjControlBase`.
 * Uso: `<ij-textarea label="Descripción" [rows]="5" formControlName="desc" />`
 */
@Component({
  selector: 'ij-textarea',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (label()) {
      <label [class]="labelClass" [attr.for]="controlId">
        {{ label() }}@if (required()) { <span class="text-brand">*</span> }
      </label>
    }
    <div [class]="boxClass()">
      <textarea
        [id]="controlId"
        class="w-full resize-y bg-transparent py-2.5 text-[14px] leading-relaxed text-ink-900 placeholder:text-muted outline-none"
        [rows]="rows()"
        [value]="value() ?? ''"
        [placeholder]="placeholder()"
        [attr.maxlength]="maxLength() ?? null"
        [disabled]="disabled()"
        (input)="onInput($event)"
        (focus)="focused.set(true)"
        (blur)="onBlur()"
      ></textarea>
    </div>
    @if (errorText()) {
      <p [class]="errorClass">{{ errorText() }}</p>
    } @else if (hint()) {
      <p [class]="hintClass">{{ hint() }}</p>
    }
  `,
})
export class IjTextarea extends IjControlBase<string> {
  readonly rows = input<number>(4);
  readonly maxLength = input<number | null>(null);

  protected readonly labelClass = IJ_LABEL;
  protected readonly hintClass = IJ_HINT;
  protected readonly errorClass = IJ_ERROR;
  protected readonly focused = signal(false);

  protected readonly boxClass = computed(() =>
    ijControlClass({
      focused: this.focused(),
      invalid: this.invalid(),
      disabled: this.disabled(),
    }),
  );

  protected onInput(event: Event): void {
    this.setValue((event.target as HTMLTextAreaElement).value);
  }

  protected onBlur(): void {
    this.focused.set(false);
    this.markTouched();
  }
}
