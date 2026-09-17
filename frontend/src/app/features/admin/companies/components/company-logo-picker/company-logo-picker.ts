import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { IjAvatar, IjButton } from '@/shared/ui';

const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const LOGO_MAX_BYTES = 5 * 1024 * 1024;

@Component({
  selector: 'app-company-logo-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjAvatar, IjButton],
  template: `
    <div class="flex items-center gap-4">
      <ij-avatar
        class="h-16 w-16 rounded-2xl border border-line bg-surface text-lg font-bold text-brand"
        [src]="logoUrl()"
        [name]="companyName()"
      />
      <div class="flex flex-col items-start gap-1.5">
        <div class="flex items-center gap-2">
          <input
            #fileInput
            type="file"
            accept="image/png,image/jpeg,image/webp"
            class="hidden"
            (change)="onFileSelected($event)"
          />
          <button
            ij-button
            type="button"
            shape="rounded"
            size="sm"
            [disabled]="uploading()"
            (click)="fileInput.click()"
          >
            {{ uploading() ? 'Subiendo...' : 'Subir logo' }}
          </button>
          @if (logoUrl()) {
            <button
              ij-button
              type="button"
              variant="white"
              shape="rounded"
              size="sm"
              [disabled]="uploading()"
              (click)="remove.emit()"
            >
              Quitar
            </button>
          }
        </div>
        <span class="text-[12px] text-muted">JPG, PNG o WebP · max. 5 MB.</span>
      </div>
    </div>
  `,
})
export class CompanyLogoPicker {
  readonly logoUrl = input<string | null>(null);
  readonly companyName = input<string>('');
  readonly uploading = input(false);

  readonly fileSelected = output<File>();
  readonly remove = output<void>();

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type)) {
      alert('Selecciona una imagen JPG, PNG o WebP.');
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      alert('La imagen no puede superar los 5 MB.');
      return;
    }
    this.fileSelected.emit(file);
  }
}
