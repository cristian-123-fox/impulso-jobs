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
import {
  type CountryCode,
  DEFAULT_COUNTRY,
  SUPPORTED_COUNTRIES,
  countryByCode,
} from '@/shared/catalogs/countries.catalogs';
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
import { IjControlBase } from '@/shared/ui/forms/ij-control-base';
import { IjIcon } from '@/shared/ui/icon/icon';
import {
  type IjPhoneValue,
  emptyPhoneValue,
  normalizePhone,
} from '@/shared/utils/phone';

export type { IjPhoneValue } from '@/shared/utils/phone';

/**
 * Teléfono con indicativo de país (T36).
 *
 * ```html
 * <ij-phone-input label="Teléfono" formControlName="phone" />
 * <ij-phone-input label="Teléfono" formControlName="phone" [lockCountry]="true" />
 * ```
 *
 * El valor es un **objeto** `IjPhoneValue` y no la cadena E.164: `+1` es Estados
 * Unidos **y** Canadá, así que con la cadena `writeValue` no podría saber qué
 * país pintar (decisiones D-1 y D-5). Para pasar de y a la API están
 * `toPhonePayload` / `fromPhonePayload` en `shared/utils/phone.ts`.
 *
 * ⚠️ **Nada de banderas emoji.** Chrome sobre Windows no trae el tipo de letra
 * de banderas regionales y pinta las dos letras del país en su lugar: el equipo
 * desarrolla en Windows y vería un resultado distinto al de producción. Se
 * muestra `MX +52` como texto, que además es lo que la gente busca. Si algún día
 * se quieren banderas, que sea un sprite SVG — nunca un `<img>` por país ni
 * `[innerHTML]` sobre un `<svg>` (rompe el SSR).
 *
 * `lockCountry` deja el selector visible pero sin abrir: es lo que usa el
 * teléfono de la **empresa**, que siempre es mexicana (D-10).
 */
@Component({
  selector: 'ij-phone-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OverlayModule, A11yModule, IjIcon],
  host: { class: 'block' },
  template: `
    @if (label()) {
      <label [for]="controlId" [class]="labelClass">
        {{ label() }}@if (required()) { <span class="text-brand-strong">*</span> }
      </label>
    }

    <div [class]="boxClass() + ' !px-0'">
      <!-- Disparador del país, dentro de la misma caja y separado por un borde. -->
      <button
        #trigger
        type="button"
        cdkOverlayOrigin
        #origin="cdkOverlayOrigin"
        class="flex h-full shrink-0 items-center gap-1.5 border-r border-line pl-3.5 pr-2.5 text-[14px] font-medium text-ink-900 outline-none"
        [class.cursor-pointer]="!countryLocked()"
        [class.cursor-not-allowed]="countryLocked()"
        [disabled]="disabled() || lockCountry()"
        [attr.aria-label]="i18n.t('ui.phone.countryLabel')"
        [attr.aria-expanded]="open()"
        aria-haspopup="listbox"
        (click)="toggle()"
        (keydown)="onTriggerKeydown($event)"
      >
        <span>{{ country().code }}</span>
        <span class="text-muted">+{{ country().dialCode }}</span>
        @if (!countryLocked()) {
          <ij-icon name="chevron-down" [size]="14" class="text-muted" />
        }
      </button>

      <input
        [id]="controlId"
        type="tel"
        inputmode="tel"
        autocomplete="tel-national"
        [class]="inputClass + ' pr-3.5'"
        [value]="national()"
        [disabled]="disabled()"
        [placeholder]="placeholder() || examplePlaceholder()"
        [attr.maxlength]="country().nationalDigits + 6"
        (input)="onInput($event)"
        (blur)="markTouched()"
      />
    </div>

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
        [class]="panelClass + ' min-w-[240px]'"
        cdkTrapFocus
        [cdkTrapFocusAutoCapture]="true"
        (keydown)="onPanelKeydown($event)"
      >
        @for (item of countries; track item.code; let i = $index) {
          <div
            role="option"
            [attr.aria-selected]="item.code === country().code"
            [class]="optionClass(item.code === country().code, i === highlight())"
            (click)="selectCountry(item.code)"
            (mouseenter)="highlight.set(i)"
          >
            <span class="truncate">{{ countryLabel(item.code) }}</span>
            <span class="shrink-0 text-muted">+{{ item.dialCode }}</span>
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
export class IjPhoneInput extends IjControlBase<IjPhoneValue> {
  /** Deja el país fijo (empresa: siempre México, D-10). */
  readonly lockCountry = input<boolean>(false);
  /** País con el que nace el control cuando el valor llega vacío. */
  readonly defaultCountry = input<CountryCode>(DEFAULT_COUNTRY);

  protected readonly labelClass = IJ_LABEL;
  protected readonly hintClass = IJ_HINT;
  protected readonly errorClass = IJ_ERROR;
  protected readonly inputClass = IJ_NATIVE_INPUT;
  protected readonly panelClass = IJ_PANEL;
  protected readonly positions = IJ_OVERLAY_POSITIONS;
  protected readonly countries = SUPPORTED_COUNTRIES;

  protected readonly open = signal(false);
  protected readonly focused = signal(false);
  protected readonly highlight = signal(0);
  private readonly trigger = viewChild<ElementRef<HTMLElement>>('trigger');

  protected readonly country = computed(
    () =>
      countryByCode(this.value()?.country) ??
      countryByCode(this.defaultCountry())!,
  );

  protected readonly national = computed(() => this.value()?.national ?? '');

  protected readonly countryLocked = computed(
    () => this.lockCountry() || this.disabled(),
  );

  protected readonly boxClass = computed(() =>
    ijControlClass({
      focused: this.open(),
      invalid: this.invalid(),
      disabled: this.disabled(),
    }),
  );

  /** `3312345678` para México, `3101234567` para Colombia… */
  protected readonly examplePlaceholder = computed(() =>
    '0'.repeat(this.country().nationalDigits),
  );

  protected optionClass = ijOptionClass;

  protected countryLabel(code: string): string {
    return this.i18n.enumLabel('country', code);
  }

  protected onInput(event: Event): void {
    // Sólo dígitos: pegar «(33) 1234-5678» deja el número, no los signos.
    const digits = (event.target as HTMLInputElement).value.replace(/\D/g, '');
    this.emit(this.country().code as CountryCode, digits);
  }

  protected selectCountry(code: string): void {
    // Cambiar de país **recalcula el E.164** con el mismo número nacional: el
    // número no se pierde al corregir el país.
    this.emit(code as CountryCode, this.national());
    this.open.set(false);
    this.markTouched();
    this.trigger()?.nativeElement.focus();
  }

  private emit(country: CountryCode, national: string): void {
    if (!national) {
      this.setValue(emptyPhoneValue(country));
      return;
    }
    this.setValue({
      country,
      national,
      e164: normalizePhone(country, national),
    });
  }

  protected toggle(): void {
    if (this.countryLocked()) return;
    this.open() ? this.close() : this.openPanel();
  }

  protected openPanel(): void {
    if (this.countryLocked()) return;
    this.highlight.set(
      Math.max(
        0,
        this.countries.findIndex((item) => item.code === this.country().code),
      ),
    );
    this.open.set(true);
  }

  protected close(): void {
    if (this.open()) {
      this.open.set(false);
      this.markTouched();
    }
  }

  protected onTriggerKeydown(event: KeyboardEvent): void {
    if (!this.open() && (event.key === 'ArrowDown' || event.key === 'Enter')) {
      event.preventDefault();
      this.openPanel();
    }
  }

  protected onPanelKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.highlight.update((i) => Math.min(i + 1, this.countries.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.highlight.update((i) => Math.max(i - 1, 0));
        break;
      case 'Enter': {
        event.preventDefault();
        const item = this.countries[this.highlight()];
        if (item) this.selectCountry(item.code);
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
