import {
  computed,
  DestroyRef,
  Directive,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, NgControl, ValidationErrors } from '@angular/forms';
import { AppTranslateService } from '@/core/i18n/app-translate.service';

let uid = 0;

/**
 * Primer error de validación como **clave + parámetros** (T26), no como texto:
 * quien lo resuelve es el control, que sí puede traducir y repintarse al
 * cambiar de idioma.
 */
export function ijFirstErrorKey(
  errors: ValidationErrors | null,
): { key: string; params?: Record<string, unknown> } | null {
  if (!errors) return null;
  if (errors['required']) return { key: 'validation.required' };
  if (errors['email']) return { key: 'validation.email' };
  if (errors['minlength']) {
    return {
      key: 'validation.minLength',
      params: { length: errors['minlength'].requiredLength },
    };
  }
  if (errors['maxlength']) {
    return {
      key: 'validation.maxLength',
      params: { length: errors['maxlength'].requiredLength },
    };
  }
  if (errors['min']) {
    return { key: 'validation.min', params: { value: errors['min'].min } };
  }
  if (errors['max']) {
    return { key: 'validation.max', params: { value: errors['max'].max } };
  }
  if (errors['pattern']) return { key: 'validation.pattern' };
  return { key: 'validation.invalid' };
}

/**
 * Base de los controles de formulario del UI Kit. Se auto-registra como
 * `ControlValueAccessor` del `NgControl` (patrón self) para funcionar con
 * `formControlName`/`ngModel` y poder leer el estado de validación sin acoplar a
 * un proveedor NG_VALUE_ACCESSOR. Sin plantilla: cada control la aporta.
 */
@Directive()
export abstract class IjControlBase<T> implements ControlValueAccessor, OnInit {
  /** NgControl del host (formControlName/ngModel), si existe. */
  readonly ngControl = inject(NgControl, { optional: true, self: true });
  private readonly destroyRef = inject(DestroyRef);
  /** `protected`: las plantillas de los controles hijos también traducen. */
  protected readonly i18n = inject(AppTranslateService);
  private readonly statusVersion = signal(0);

  readonly label = input<string>('');
  readonly hint = input<string>('');
  readonly placeholder = input<string>('');
  readonly required = input<boolean>(false);
  /** Mensaje de error explícito; si no se da, se deriva del validador. */
  readonly error = input<string | null>(null);

  protected readonly controlId = `ij-${++uid}`;
  protected readonly value = signal<T | null>(null);
  protected readonly disabled = signal(false);

  protected onChange: (value: T | null) => void = () => undefined;
  protected onTouched: () => void = () => undefined;

  constructor() {
    if (this.ngControl) this.ngControl.valueAccessor = this;
  }

  ngOnInit(): void {
    const control = this.ngControl?.control;
    control?.statusChanges
      ?.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.statusVersion.update((v) => v + 1));
  }

  // ---- ControlValueAccessor ----
  writeValue(value: T | null): void {
    this.value.set(value);
  }
  registerOnChange(fn: (value: T | null) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  // ---- helpers para las subclases ----
  protected setValue(value: T | null): void {
    this.value.set(value);
    this.onChange(value);
  }

  protected markTouched(): void {
    this.onTouched();
    this.statusVersion.update((v) => v + 1);
  }

  protected readonly invalid = computed(() => {
    this.statusVersion();
    const control = this.ngControl?.control;
    return !!control && control.invalid && (control.touched || control.dirty);
  });

  protected readonly errorText = computed<string | null>(() => {
    const explicit = this.error();
    if (explicit) return explicit;
    if (!this.invalid()) return null;
    const error = ijFirstErrorKey(this.ngControl?.control?.errors ?? null);
    return error ? this.i18n.t(error.key, error.params) : null;
  });
}
