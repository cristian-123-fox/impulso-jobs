import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiErrorResponse } from '@/core/models/api-response.models';
import { CandidateResumeFacade } from '@/features/panel/data/candidate-resume.facade';
import { CandidateResume } from '@/features/panel/models/candidate-resume.models';
import { IjBadge, IjButton, IjIcon } from '@/shared/ui';

@Component({
  selector: 'app-candidate-resumes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjBadge, IjButton, IjIcon],
  template: `
    <div class="space-y-5">
      <section class="rounded-2xl bg-white p-6 shadow-card">
        <div
          class="flex flex-col gap-4 rounded-2xl border border-dashed border-brand/30 bg-brand/5 p-6 lg:flex-row lg:items-center lg:justify-between"
        >
          <div class="max-w-2xl">
            <div class="mb-3 flex items-center gap-3">
              <span
                class="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/10 text-brand"
              >
                <ij-icon name="file" [size]="22" />
              </span>
              <div>
                <h2 class="text-lg font-bold text-ink-900">Carga tu hoja de vida en PDF</h2>
                <p class="text-sm text-muted">
                  Conservamos el nombre original, aceptamos solo PDF y un máximo de 5MB.
                </p>
              </div>
            </div>

            <div class="grid gap-2 text-[13px] text-muted sm:grid-cols-3">
              <div class="rounded-xl bg-white/80 px-3 py-2">Solo PDF valido</div>
              <div class="rounded-xl bg-white/80 px-3 py-2">Tamano maximo 5MB</div>
              <div class="rounded-xl bg-white/80 px-3 py-2">Una sola hoja principal</div>
            </div>
          </div>

          <div class="flex flex-col items-start gap-3">
            <input
              #fileInput
              type="file"
              accept="application/pdf,.pdf"
              class="hidden"
              (change)="onFileSelected($event)"
            />
            <button
              ij-button
              type="button"
              variant="primary"
              shape="rounded"
              [disabled]="uploading()"
              (click)="fileInput.click()"
            >
              <ij-icon [name]="uploading() ? 'clock' : 'plus'" [size]="16" />
              {{ uploading() ? 'Cargando...' : 'Subir hoja de vida' }}
            </button>
            <p class="text-xs text-muted">
              Puedes guardar varias versiones y definir una como principal.
            </p>
          </div>
        </div>

        @if (banner()) {
          <div
            class="mt-4 rounded-xl px-4 py-3 text-sm"
            [class]="bannerTone() === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'"
          >
            {{ banner() }}
          </div>
        }
      </section>

      <section class="rounded-2xl bg-white p-6 shadow-card">
        <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 class="text-base font-bold text-ink-900">Mis hojas de vida</h3>
            <p class="mt-1 text-sm text-muted">
              {{ summary() }}
            </p>
          </div>
          @if (defaultResume(); as principal) {
            <ij-badge tone="green">Principal: {{ principal.fileName }}</ij-badge>
          }
        </div>

        @if (facade.loading() && !facade.loaded()) {
          <div class="rounded-2xl border border-line bg-surface/60 p-8 text-center text-muted">
            Cargando hojas de vida...
          </div>
        } @else if (facade.error()) {
          <div class="rounded-2xl border border-red-100 bg-red-50 p-8 text-center text-red-700">
            {{ facade.error() }}
          </div>
        } @else if (!resumes().length) {
          <div class="rounded-2xl border border-dashed border-line p-10 text-center">
            <div
              class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface text-muted"
            >
              <ij-icon name="resume" [size]="24" />
            </div>
            <h4 class="text-base font-semibold text-ink-900">Aún no has subido una hoja de vida</h4>
            <p class="mt-2 text-sm text-muted">
              Sube tu primer PDF para compartir tu perfil en los procesos de selección.
            </p>
          </div>
        } @else {
          <div class="space-y-4">
            @for (resume of resumes(); track resume.id) {
              <article
                class="flex flex-col gap-4 rounded-2xl border border-line p-5 transition-colors hover:border-brand/30 hover:bg-surface/40 lg:flex-row lg:items-center lg:justify-between"
              >
                <div class="min-w-0 flex-1">
                  <div class="mb-2 flex flex-wrap items-center gap-2">
                    <h4 class="truncate text-sm font-semibold text-ink-900">
                      {{ resume.fileName }}
                    </h4>
                    @if (resume.isDefault) {
                      <ij-badge tone="green">Principal</ij-badge>
                    } @else {
                      <span
                        class="inline-block rounded-md bg-surface px-3 py-1.5 text-[11px] font-semibold text-muted"
                      >
                        Secundaria
                      </span>
                    }
                  </div>

                  <div class="flex flex-wrap gap-x-4 gap-y-2 text-[13px] text-muted">
                    <span>{{ formatFileSize(resume.fileSize) }}</span>
                    <span>{{ formatDate(resume.createdAt) }}</span>
                    <span>{{ resume.mimeType }}</span>
                  </div>
                </div>

                <div class="flex flex-wrap items-center gap-2">
                  @if (!resume.isDefault) {
                    <button
                      ij-button
                      type="button"
                      variant="soft"
                      shape="rounded"
                      size="sm"
                      [disabled]="busyId() === resume.id"
                      (click)="selectAsDefault(resume)"
                    >
                      <ij-icon name="check" [size]="14" />
                      Principal
                    </button>
                  }

                  <button
                    ij-button
                    type="button"
                    variant="white"
                    shape="rounded"
                    size="sm"
                    [disabled]="busyId() === resume.id"
                    (click)="download(resume)"
                  >
                    <ij-icon name="file" [size]="14" />
                    Descargar
                  </button>

                  <button
                    ij-button
                    type="button"
                    variant="white"
                    shape="rounded"
                    size="sm"
                    class="border border-red-200 text-red-600 hover:bg-red-50"
                    [disabled]="busyId() === resume.id"
                    (click)="remove(resume)"
                  >
                    <ij-icon name="x" [size]="14" />
                    Eliminar
                  </button>
                </div>
              </article>
            }
          </div>
        }
      </section>
    </div>
  `,
})
export class CandidateResumesComponent {
  protected readonly facade = inject(CandidateResumeFacade);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly uploading = signal(false);
  protected readonly busyId = signal<string | null>(null);
  protected readonly banner = signal<string | null>(null);
  protected readonly bannerTone = signal<'success' | 'error'>('success');

  protected readonly resumes = this.facade.resumes;
  protected readonly defaultResume = computed(
    () => this.resumes().find((resume) => resume.isDefault) ?? null,
  );
  protected readonly summary = computed(() => {
    const total = this.resumes().length;
    if (total === 0) {
      return 'Mantén una versión principal y conserva otras adaptadas por vacante.';
    }

    return `${total} hoja${total === 1 ? '' : 's'} de vida cargada${total === 1 ? '' : 's'}.`;
  });

  constructor() {
    this.facade
      .load()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.item(0);
    if (!file) {
      return;
    }

    this.uploading.set(true);
    this.clearBanner();
    this.facade
      .upload(file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.uploading.set(false);
          this.showSuccess('Hoja de vida cargada correctamente.');
          if (input) {
            input.value = '';
          }
        },
        error: (error: unknown) => {
          this.uploading.set(false);
          this.showError(this.messageOf(error));
          if (input) {
            input.value = '';
          }
        },
      });
  }

  protected selectAsDefault(resume: CandidateResume): void {
    this.busyId.set(resume.id);
    this.clearBanner();

    this.facade
      .select(resume.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.busyId.set(null);
          this.showSuccess(`"${resume.fileName}" ahora es tu hoja de vida principal.`);
        },
        error: (error: unknown) => {
          this.busyId.set(null);
          this.showError(this.messageOf(error));
        },
      });
  }

  protected download(resume: CandidateResume): void {
    this.busyId.set(resume.id);
    this.clearBanner();

    this.facade
      .download(resume.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (download) => {
          this.busyId.set(null);
          this.saveBlob(download.blob, download.fileName);
        },
        error: (error: unknown) => {
          this.busyId.set(null);
          this.showError(this.messageOf(error));
        },
      });
  }

  protected remove(resume: CandidateResume): void {
    if (!window.confirm(`¿Deseas eliminar "${resume.fileName}"?`)) {
      return;
    }

    this.busyId.set(resume.id);
    this.clearBanner();

    this.facade
      .remove(resume.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.busyId.set(null);
          this.showSuccess('Hoja de vida eliminada correctamente.');
        },
        error: (error: unknown) => {
          this.busyId.set(null);
          this.showError(this.messageOf(error));
        },
      });
  }

  protected formatFileSize(size: number): string {
    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    }

    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  }

  private clearBanner(): void {
    this.banner.set(null);
  }

  private showSuccess(message: string): void {
    this.bannerTone.set('success');
    this.banner.set(message);
  }

  private showError(message: string): void {
    this.bannerTone.set('error');
    this.banner.set(message);
  }

  private saveBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private messageOf(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as ApiErrorResponse | Blob | null;
      if (body && !(body instanceof Blob)) {
        switch (body.errorCode) {
          case 'CANDIDATE_RESUME_INVALID_TYPE':
            return 'Solo puedes subir archivos PDF válidos.';
          case 'CANDIDATE_RESUME_TOO_LARGE':
            return 'La hoja de vida no puede superar los 5MB.';
          case 'CANDIDATE_RESUME_FILE_NOT_FOUND':
            return 'El archivo ya no está disponible en el almacenamiento.';
          default:
            return body.message ?? 'No fue posible completar la operación.';
        }
      }
    }

    return 'No fue posible completar la operación.';
  }
}
