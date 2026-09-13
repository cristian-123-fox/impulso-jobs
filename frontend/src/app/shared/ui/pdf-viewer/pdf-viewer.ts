import { A11yModule } from '@angular/cdk/a11y';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AppTranslateService } from '@/core/i18n/app-translate.service';
import { IjIcon } from '@/shared/ui/icon/icon';

/** Fichero ya descargado que el visor pinta. */
export interface IjPdfFile {
  readonly blob: Blob;
  readonly fileName: string;
}

/**
 * El navegador se queda con la URL un rato después de abrir la pestaña nueva.
 * Revocar antes deja la pestaña en blanco; no revocar nunca filtra el blob.
 */
const NEW_TAB_REVOKE_MS = 60_000;

/**
 * Visor de PDF a pantalla completa (T30).
 *
 * Es un overlay propio y no un `ij-modal` a propósito: una hoja A4 no se lee
 * cómoda en los 900px del diálogo más grande del kit. El resto del back-office
 * sigue editando en `ij-modal` — esta es la excepción de "lo que no cabe en un
 * diálogo", igual que la matriz de permisos.
 *
 * Render nativo: `<iframe>` sobre un blob URL, sin librería. En iOS y en
 * pantallas pequeñas el visor embebido no es fiable (suele pintar sólo la
 * primera página), así que ahí se degrada a "Abrir en pestaña nueva".
 *
 * El padre descarga el fichero y le pasa el estado; el visor no conoce la API.
 * Uso: `@if (open()) { <ij-pdf-viewer [file]="…" [loading]="…" … /> }`
 */
@Component({
  selector: 'ij-pdf-viewer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [A11yModule, IjIcon],
  template: `
    <div
      class="fixed inset-0 z-50 flex flex-col bg-ink-900/80 backdrop-blur-[2px]"
      (keydown.escape)="close.emit()"
    >
      <div
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="title()"
        cdkTrapFocus
        [cdkTrapFocusAutoCapture]="true"
        class="m-auto flex h-full max-h-[min(100%,1000px)] w-full max-w-[1200px] flex-col overflow-hidden bg-white shadow-float sm:h-[92vh] sm:rounded-2xl"
      >
        <header
          class="flex flex-shrink-0 items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-5 sm:py-4"
        >
          <div class="min-w-0">
            <h2 class="truncate text-base font-bold text-ink-900">{{ title() }}</h2>
            @if (subtitle()) {
              <p class="mt-0.5 truncate text-[13px] text-muted">{{ subtitle() }}</p>
            }
          </div>

          <div class="flex flex-shrink-0 items-center gap-1.5">
            @if (file(); as current) {
              <button
                type="button"
                class="hidden h-9 items-center gap-1.5 rounded-[10px] px-3 text-[13px] font-semibold text-body transition-colors hover:bg-surface sm:inline-flex"
                (click)="openInNewTab(current)"
              >
                <ij-icon name="share" [size]="15" />
                Abrir en pestaña nueva
              </button>
              <button
                type="button"
                class="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-brand px-3 text-[13px] font-semibold text-white transition-colors hover:bg-brand-700"
                (click)="download(current)"
              >
                <ij-icon name="file" [size]="15" />
                Descargar
              </button>
            }
            <button
              type="button"
              [attr.aria-label]="i18n.t('common.close')"
              class="flex h-9 w-9 items-center justify-center rounded-[10px] text-muted transition-colors hover:bg-surface hover:text-body"
              (click)="close.emit()"
            >
              <ij-icon name="close" [size]="20" />
            </button>
          </div>
        </header>

        <div class="min-h-0 flex-1 bg-surface">
          @if (loading()) {
            <div class="flex h-full items-center justify-center p-8 text-[13.5px] text-muted">
              Abriendo la hoja de vida…
            </div>
          } @else if (error(); as message) {
            <div class="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
              <span
                class="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600"
              >
                <ij-icon name="alert-triangle" [size]="22" />
              </span>
              <p class="text-[13.5px] font-semibold text-red-600">{{ message }}</p>
            </div>
          } @else if (file(); as current) {
            @if (embedded()) {
              <iframe
                [src]="source()"
                [title]="current.fileName"
                class="h-full w-full border-0 bg-surface"
              ></iframe>
            } @else {
              <div class="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
                <span
                  class="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand"
                >
                  <ij-icon name="resume" [size]="24" />
                </span>
                <p class="max-w-xs text-[13.5px] text-muted">
                  Tu navegador no muestra PDF dentro de la página. Ábrelo en una pestaña
                  nueva o descárgalo.
                </p>
                <div class="flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    class="inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand px-4 text-[13px] font-semibold text-white"
                    (click)="openInNewTab(current)"
                  >
                    <ij-icon name="share" [size]="15" />
                    Abrir en pestaña nueva
                  </button>
                  <button
                    type="button"
                    class="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white px-4 text-[13px] font-semibold text-body shadow-card"
                    (click)="download(current)"
                  >
                    <ij-icon name="file" [size]="15" />
                    Descargar
                  </button>
                </div>
              </div>
            }
          } @else {
            <div class="flex h-full items-center justify-center p-8 text-[13.5px] text-muted">
              No hay ninguna hoja de vida que mostrar.
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class IjPdfViewer {
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
  /** `null` mientras carga, si falla, o si no hay CV que mostrar. */
  readonly file = input<IjPdfFile | null>(null);
  readonly loading = input<boolean>(false);
  readonly error = input<string | null>(null);
  readonly close = output<void>();

  protected readonly i18n = inject(AppTranslateService);
  protected readonly source = signal<SafeResourceUrl | null>(null);
  /** Falso en iOS y en pantallas pequeñas: ahí el `<iframe>` no es fiable. */
  protected readonly embedded = signal(true);

  private readonly document = inject(DOCUMENT);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private objectUrl: string | null = null;

  constructor() {
    // El blob se revoca en el constructor y no dentro de `afterNextRender`:
    // si el visor se cierra antes de pintar, el efecto ya pudo crear la URL.
    inject(DestroyRef).onDestroy(() => {
      this.document.body.classList.remove('overflow-hidden');
      this.releaseObjectUrl();
    });

    effect(() => {
      const current = this.file();
      if (!this.isBrowser) return;

      this.releaseObjectUrl();
      if (!current) {
        this.source.set(null);
        return;
      }

      // `#view=FitH` hace que el visor nativo abra la hoja ajustada al ancho.
      this.objectUrl = URL.createObjectURL(current.blob);
      this.source.set(
        this.sanitizer.bypassSecurityTrustResourceUrl(
          `${this.objectUrl}#view=FitH`,
        ),
      );
    });

    afterNextRender(() => {
      this.document.body.classList.add('overflow-hidden');
      this.embedded.set(this.supportsEmbeddedPdf());
    });
  }

  protected download(file: IjPdfFile): void {
    const url = URL.createObjectURL(file.blob);
    const anchor = this.document.createElement('a');
    anchor.href = url;
    anchor.download = file.fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  protected openInNewTab(file: IjPdfFile): void {
    // URL propia: la del `<iframe>` se revoca al cerrar el visor y dejaría la
    // pestaña recién abierta en blanco.
    const url = URL.createObjectURL(file.blob);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), NEW_TAB_REVOKE_MS);
  }

  private releaseObjectUrl(): void {
    if (!this.objectUrl) return;
    URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = null;
  }

  /**
   * iOS nunca embebe un PDF completo (pinta sólo la primera página) y por
   * debajo de 768px el visor nativo queda inservible. `maxTouchPoints` cubre
   * al iPad, que desde iPadOS 13 se anuncia como Mac.
   */
  private supportsEmbeddedPdf(): boolean {
    const ua = navigator.userAgent;
    const isIos =
      /iPad|iPhone|iPod/.test(ua) ||
      (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);

    return !isIos && window.innerWidth >= 768;
  }
}
