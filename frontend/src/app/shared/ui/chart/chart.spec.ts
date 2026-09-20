import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { ApexOptions } from 'apexcharts';
import { IjChart } from '@/shared/ui/chart/chart';
import {
  areaChartOptions,
  barChartOptions,
  donutChartOptions,
  radialChartOptions,
} from '@/shared/ui/chart/chart-theme';

@Component({
  imports: [IjChart],
  template: `<ij-chart [options]="options()" [height]="240" ariaLabel="Prueba" />`,
})
class Host {
  readonly options = signal<ApexOptions>(
    areaChartOptions({
      name: 'Postulaciones',
      categories: ['1 sep', '2 sep', '3 sep'],
      values: [1, 4, 2],
    }),
  );
}

/**
 * Espera a que ApexCharts haya pintado (llega por `import()` dinámico).
 *
 * Se busca `svg.apexcharts-svg` y no `svg` a secas: Apex monta además un `<svg>`
 * auxiliar sin clase para medir texto, así que contar todos los `svg` da dos
 * desde el primer render y no significa que haya dos gráficas.
 */
function charts(fixture: ComponentFixture<Host>): NodeListOf<SVGSVGElement> {
  return (fixture.nativeElement as HTMLElement).querySelectorAll<SVGSVGElement>(
    'svg.apexcharts-svg',
  );
}

async function waitForSvg(fixture: ComponentFixture<Host>): Promise<SVGSVGElement> {
  for (let attempt = 0; attempt < 60; attempt++) {
    await fixture.whenStable();
    const svg = charts(fixture)[0];
    if (svg) return svg;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('La gráfica no se renderizó');
}

/**
 * Prueba de humo de la integración con ApexCharts. No comprueba estética: lo
 * que verifica es que la librería **se carga y dibuja de verdad**, que es lo
 * que un import dinámico puede romper sin que el compilador se entere — la
 * forma del `default` del paquete, el ciclo de vida o una opción inválida del
 * tema sólo fallan en ejecución.
 */
describe('IjChart', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
  });

  it('carga ApexCharts bajo demanda y dibuja la gráfica', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.autoDetectChanges();

    const svg = await waitForSvg(fixture);
    expect(svg).toBeTruthy();
    // Con `ariaLabel` la gráfica se anuncia como imagen con nombre.
    const labelled = (fixture.nativeElement as HTMLElement).querySelector(
      '[role="img"][aria-label="Prueba"]',
    );
    expect(labelled).toBeTruthy();

    fixture.destroy();
  });

  /**
   * Cambiar el periodo cambia el número de puntos del eje. Lo que no puede
   * pasar es que se acumulen gráficas: al tercer cambio habría tres apiladas.
   */
  it('deja una sola gráfica al cambiar las opciones', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.autoDetectChanges();
    await waitForSvg(fixture);

    for (const values of [[9, 9], [1, 2, 3, 4], [5]]) {
      fixture.componentInstance.options.set(
        areaChartOptions({
          name: 'Postulaciones',
          categories: values.map((_, index) => `${index + 1} sep`),
          values,
        }),
      );
      await fixture.whenStable();
      await new Promise((resolve) => setTimeout(resolve, 80));
    }

    expect(charts(fixture).length).toBe(1);
    expect(charts(fixture)[0].isConnected).toBe(true);

    fixture.destroy();
  });

  /** Las cuatro formas del tema tienen que ser opciones válidas para Apex. */
  it('acepta las opciones de barra, dona y radial del tema', async () => {
    for (const options of [
      barChartOptions({
        name: 'Candidaturas',
        categories: ['En revisión', 'Entrevista'],
        values: [3, 1],
      }),
      donutChartOptions({
        labels: ['Activas', 'Cerradas'],
        values: [2, 1],
        totalLabel: 'Vacantes',
      }),
      radialChartOptions({ percent: 42, label: 'Consumido' }),
    ]) {
      const fixture = TestBed.createComponent(Host);
      fixture.componentInstance.options.set(options);
      fixture.autoDetectChanges();

      expect(await waitForSvg(fixture)).toBeTruthy();
      fixture.destroy();
    }
  });
});
