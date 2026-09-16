import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { IjAvatar, IjIcon } from '@/shared/ui';

/** Mismo tope de negocio que `MAX_IMAGE_SIZE_BYTES` en el backend. */
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Foto de la cuenta: vista previa, subir y quitar.
 *
 * Valida tipo y tamaño **antes** de enviar. No es la validación de verdad —el
 * backend comprueba los magic bytes, que es lo único que no se puede falsear
 * renombrando el archivo— pero evita el viaje de ida y vuelta con un error
 * genérico cuando el problema se ve desde aquí.
 */
@Component({
  selector: 'app-account-photo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjAvatar, IjIcon],
  host: { class: 'block' },
  template: `
    <div class="flex flex-wrap items-center gap-4">
      <ij-avatar
        class="h-20 w-20 rounded-2xl bg-brand-50 text-[22px] font-extrabold text-brand-strong"
        [src]="photoUrl()"
        [name]="name()"
      />

      <div class="flex min-w-0 flex-col gap-2">
        <div class="flex flex-wrap items-center gap-2">
          <label
            class="cursor-pointer rounded-xl border border-line bg-white px-3.5 py-2 text-[13px] font-bold text-body transition-colors hover:bg-surface active:translate-y-px"
            [class.pointer-events-none]="busy()"
            [class.opacity-50]="busy()"
          >
            <input
              type="file"
              class="sr-only"
              [accept]="accepted"
              [disabled]="busy()"
              (change)="onPick($event)"
            />
            {{ photoUrl() ? 'Cambiar foto' : 'Subir foto' }}
          </label>
          @if (photoUrl()) {
            <button
              type="button"
              class="flex items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-bold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
              [disabled]="busy()"
              (click)="remove.emit()"
            >
              <ij-icon name="trash" [size]="15" />
              Quitar
            </button>
          }
        </div>
        @if (localError(); as message) {
          <p role="alert" class="text-[12.5px] font-semibold text-red-700">{{ message }}</p>
        } @else {
          <p class="text-[12.5px] text-muted">JPG, PNG o WebP. Máximo 5 MB.</p>
        }
      </div>
    </div>
  `,
})
export class AccountPhoto {
  readonly photoUrl = input<string | null>(null);
  readonly name = input<string>('');
  readonly busy = input(false);
  readonly select = output<File>();
  readonly remove = output<void>();

  protected readonly accepted = ACCEPTED.join(',');
  protected readonly localError = signal<string | null>(null);

  protected onPick(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    // Se limpia siempre: sin esto, elegir el mismo archivo tras un error no
    // vuelve a disparar `change` y parece que el botón dejó de funcionar.
    input.value = '';
    if (!file) return;

    if (!ACCEPTED.includes(file.type)) {
      this.localError.set('El formato no es válido. Usa JPG, PNG o WebP.');
      return;
    }
    if (file.size > MAX_BYTES) {
      this.localError.set('La imagen supera los 5 MB.');
      return;
    }

    this.localError.set(null);
    this.select.emit(file);
  }
}
