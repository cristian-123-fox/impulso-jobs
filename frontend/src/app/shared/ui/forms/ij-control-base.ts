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

let uid = 0;

/** Traduce el primer error de validación a un mensaje en español. */
export function ijFirstError(errors: ValidationErrors | null): string | null {
  if (!errors) return null;
  if (errors['required']) return 'Este campo es obligatorio.';
  if (errors['email']) return 'Correo electrónico no válido.';
  if (errors['minlength']) {
    return `Mínimo ${errors['minlength'].requiredLength} caracteres.`;
  }
  if (errors['maxlength']) {
    return `Máximo ${errors['maxlength'].requiredLength} caracteres.`;
  }
  if (errors['min']) return `El valor mínimo es ${errors['min'].min}.`;
  if (errors['max']) return `El valor máximo es ${errors['max'].max}.`;
  if (errors['pattern']) return 'El formato no es válido.';
  return 'El valor no es válido.';
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
    return ijFirstError(this.ngControl?.control?.errors ?? null);
  });
}
