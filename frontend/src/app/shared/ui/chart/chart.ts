import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  input,
  OnDestroy,
  PLATFORM_ID,
  signal,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { ApexOptions } from 'apexcharts';

/**
 * Gráfica del UI Kit, sobre ApexCharts.
 *
 * ```html
 * <ij-chart [options]="trendOptions()" [height]="280" ariaLabel="Postulaciones por día" />
 * ```
 *
 * **ApexCharts entra por `import()` dinámico dentro de `afterNextRender`, nunca
 * por un import normal.** Es la misma regla que `ij-editor` con CKEditor y por
 * el mismo motivo: la librería toca `window` al cargarse, y la extracción de
 * rutas del build evalúa los módulos en Node aunque `/empresa/**` sea
 * `RenderMode.Client`. Con un import estático el build de producción falla al
 * extraer rutas, no al abrir la página — el peor momento para enterarse.
 *
 * De paso, los ~500 KB de ApexCharts viajan en su propio chunk y no los carga
 * quien nunca abre un panel.
 *
 * `options` se pasa entero y sustituye a la gráfica anterior mediante
 * `updateOptions`, así que cambiar el periodo o el filtro **no** recrea el
 * elemento: Apex anima la transición entre los dos estados.
 */
@Component({
  selector: 'ij-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div
      class="relative w-full"
      [style.min-height.px]="height()"
      [attr.role]="ariaLabel() ? 'img' : null"
      [attr.aria-label]="ariaLabel() || null"
    >
      <div #host class="w-full"></div>

      @if (!ready()) {
        <!--
          Ocupa el mismo alto que la gráfica: sin esto, la tarjeta colapsa y
          el panel entero da un salto cuando llega el chunk.
        -->
        <div
          class="absolute inset-0 flex animate-pulse items-end gap-1.5 px-2 pb-6"
          aria-hidden="true"
        >
          @for (bar of skeleton; track bar) {
            <span
              class="flex-1 rounded-t-md bg-surface"
              [style.height.%]="bar"
            ></span>
          }
        </div>
      }
    </div>
  `,
})
export class IjChart implements OnDestroy {
  readonly options = input.required<ApexOptions>();
  readonly height = input(280);
  /** Descripción para lectores de pantalla; sin ella la gráfica es decorativa. */
  readonly ariaLabel = input('');

  private readonly hostRef = viewChild.required<ElementRef<HTMLElement>>('host');
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly ready = signal(false);
  protected readonly skeleton = [38, 62, 45, 78, 55, 88, 70];

  /** Instancia de ApexCharts. Tipo mínimo para no importarlo en runtime. */
  private chart: { destroy: () => void } | null = null;
  private pending = false;
  /** Llegaron opciones nuevas mientras se estaba pintando la anterior. */
  private stale = false;
  private started = false;

  constructor() {
    effect(() => {
      // Leer la señal es lo que suscribe el efecto: debe ir siempre, aunque
      // todavía no se haya pintado nada.
      this.options();
      if (this.started) void this.render();
    });

    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      this.started = true;
      void this.render();
    });
  }

  /**
   * El alto lo manda **siempre** el componente, no el tema. Sin esto, una
   * actualización con el alto por defecto del builder (280) contra una gráfica
   * creada con otro (240) hace que Apex redibuje desde cero: deja el SVG viejo
   * en el DOM y añade uno nuevo encima.
   */
  private withHeight(options: ApexOptions): ApexOptions {
    return { ...options, chart: { ...options.chart, height: this.height() } };
  }

  /**
   * Pinta la gráfica **desde cero** en cada cambio de opciones, en vez de
   * `updateOptions`.
   *
   * Es una decisión deliberada: los cambios de este panel son estructurales
   * —otro número de puntos en el eje, otras categorías, a veces otro tipo de
   * gráfica—, y ahí `updateOptions` depende de cuánto sepa Apex reconciliar.
   * Recrear cuesta unos milisegundos para media docena de gráficas, es
   * predecible, y de paso repite la animación de entrada, que es justo lo que
   * se quiere al cambiar de periodo.
   */
  private async render(): Promise<void> {
    if (this.pending) {
      // Otro cambio mientras se pintaba: se atiende al terminar, una sola vez.
      this.stale = true;
      return;
    }
    this.pending = true;

    const { default: ApexCharts } = await import('apexcharts');
    const element = this.hostRef().nativeElement;
    this.chart?.destroy();
    element.replaceChildren();

    const chart = new ApexCharts(element, this.withHeight(this.options()));
    this.chart = chart as unknown as typeof this.chart;
    await chart.render();

    this.pending = false;
    this.ready.set(true);

    if (this.stale) {
      this.stale = false;
      await this.render();
    }
  }

  ngOnDestroy(): void {
    // Apex registra escuchas de `resize` en `window`: sin destruirlo, cada
    // visita al panel deja una gráfica viva de fondo.
    this.chart?.destroy();
    this.chart = null;
  }
}
