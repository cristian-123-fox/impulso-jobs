import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { IjControlBase } from '@/shared/ui/forms/ij-control-base';
import {
  IJ_ERROR,
  IJ_HINT,
  IJ_LABEL,
  IJ_NATIVE_INPUT,
  ijControlClass,
} from '@/shared/ui/forms/control-styles';

type InputType = 'text' | 'email' | 'number' | 'tel' | 'password' | 'url';

/**
 * Input de una línea del UI Kit (Tailwind + brand). Implementa
 * ControlValueAccessor vía `IjControlBase`, así que funciona con
 * `formControlName`/`ngModel` y muestra el estado de validación.
 *
 * Uso: `<ij-input label="Correo" type="email" formControlName="email" />`
 */
@Component({
  selector: 'ij-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (label()) {
      <label [class]="labelClass" [attr.for]="controlId">
        {{ label() }}@if (required()) { <span class="text-brand">*</span> }
      </label>
    }
    <div [class]="boxClass()">
      <input
        [id]="controlId"
        [class]="nativeClass"
        [type]="type()"
        [value]="value() ?? ''"
        [placeholder]="placeholder()"
        [attr.inputmode]="inputmode() || null"
        [attr.autocomplete]="autocomplete() || null"
        [attr.maxlength]="maxLength() ?? null"
        [attr.min]="min() ?? null"
        [attr.max]="max() ?? null"
        [disabled]="disabled()"
        (input)="onInput($event)"
        (focus)="focused.set(true)"
        (blur)="onBlur()"
      />
      <ng-content select="[ijSuffix]" />
    </div>
    @if (errorText()) {
      <p [class]="errorClass">{{ errorText() }}</p>
    } @else if (hint()) {
      <p [class]="hintClass">{{ hint() }}</p>
    }
  `,
})
export class IjInput extends IjControlBase<string> {
  readonly type = input<InputType>('text');
  readonly inputmode = input<string>('');
  readonly autocomplete = input<string>('');
  readonly maxLength = input<number | null>(null);
  readonly min = input<number | null>(null);
  readonly max = input<number | null>(null);

  protected readonly labelClass = IJ_LABEL;
  protected readonly hintClass = IJ_HINT;
  protected readonly errorClass = IJ_ERROR;
  protected readonly nativeClass = IJ_NATIVE_INPUT;
  protected readonly focused = signal(false);

  protected readonly boxClass = computed(() =>
    ijControlClass({
      focused: this.focused(),
      invalid: this.invalid(),
      disabled: this.disabled(),
    }),
  );

  protected onInput(event: Event): void {
    this.setValue((event.target as HTMLInputElement).value);
  }

  protected onBlur(): void {
    this.focused.set(false);
    this.markTouched();
  }
}
