import type { ApexOptions } from 'apexcharts';

/**
 * Tema de las gráficas: paleta, tipografía y geometría de las marcas.
 *
 * ⚠️ **Los colores están copiados de `tailwind.config.js`**, igual que en
 * `email-theme.ts` del backend y por el mismo motivo: ApexCharts recibe los
 * colores como cadenas en JavaScript, no puede leer una clase de Tailwind. Si
 * cambias un color de marca, cámbialo **en los dos sitios**.
 *
 * La paleta categórica **está validada**, no elegida a ojo: pasa la banda de
 * luminosidad, el suelo de croma, la separación para daltonismo (protan,
 * deutan y tritan), el suelo de visión normal y el contraste contra el blanco.
 * El **orden es fijo**: la primera serie siempre es naranja, la segunda morada,
 * etc. Reordenarlos rompe la separación entre pares adyacentes — la que menos
 * margen tiene es naranja↔verde, que en protanopia se acercan, y por eso el
 * morado va en medio. Si necesitas una quinta categoría, valídala antes o
 * agrúpala en «Otras».
 */
export const IJ_CHART_PALETTE = [
  '#b3571d', // brand-700
  '#6d3fc0', // morado
  '#147a4d', // accent green-strong
  '#2b6df4', // accent blue
] as const;

/**
 * Colores de **estado**, reservados: no se reutilizan como «serie 4». Siempre
 * viajan con su etiqueta al lado; el color nunca es la única pista.
 */
export const IJ_CHART_STATUS = {
  active: '#147a4d',
  paused: '#92560f',
  closed: '#6d6d84',
  draft: '#2b6df4',
  danger: '#b8213d',
  brand: '#b3571d',
} as const;

const INK = '#1a1a2e';
const MUTED = '#6d6d84';
const LINE = '#eceef3';
const FONT = 'Rubik, Inter, system-ui, sans-serif';

/** Ejes y rejilla recesivos: la tinta va en los datos, no en el andamiaje. */
const AXIS_LABEL = {
  style: { colors: MUTED, fontSize: '11.5px', fontFamily: FONT, fontWeight: 500 },
};

function baseOptions(height: number): ApexOptions {
  return {
    chart: {
      height,
      fontFamily: FONT,
      foreColor: MUTED,
      toolbar: { show: false },
      zoom: { enabled: false },
      // La animación de entrada es lo que da la sensación de vida al abrir el
      // panel; en las actualizaciones se mantiene corta para no marear.
      animations: {
        enabled: true,
        speed: 600,
        animateGradually: { enabled: true, delay: 80 },
        dynamicAnimation: { enabled: true, speed: 300 },
      },
      parentHeightOffset: 0,
    },
    // Nunca un número sobre cada punto: satura la gráfica y compite con el eje.
    dataLabels: { enabled: false },
    grid: {
      borderColor: LINE,
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
      padding: { top: 0, right: 8, bottom: 0, left: 8 },
    },
    tooltip: {
      style: { fontSize: '12.5px', fontFamily: FONT },
      theme: 'light',
    },
    states: {
      hover: { filter: { type: 'lighten' } },
      active: { filter: { type: 'none' } },
    },
    noData: {
      text: 'Sin datos todavía',
      style: { color: MUTED, fontSize: '13px', fontFamily: FONT },
    },
  };
}

export interface AreaChartInput {
  /** Etiquetas del eje X, ya formateadas para leerse. */
  categories: string[];
  values: number[];
  /** Nombre de la serie: con una sola, sustituye a la leyenda. */
  name: string;
  height?: number;
}

/**
 * Evolución en el tiempo. Una sola serie, así que **no lleva leyenda**: el
 * título del bloque ya dice qué se está midiendo.
 */
export function areaChartOptions(input: AreaChartInput): ApexOptions {
  const height = input.height ?? 280;
  return {
    ...baseOptions(height),
    chart: { ...baseOptions(height).chart, type: 'area', sparkline: { enabled: false } },
    series: [{ name: input.name, data: input.values }],
    colors: [IJ_CHART_STATUS.brand],
    stroke: { curve: 'smooth', width: 2.5, lineCap: 'round' },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.35,
        opacityTo: 0.02,
        stops: [0, 95],
      },
    },
    markers: {
      size: 0,
      // Visible sólo al apuntar: 10px de diámetro, muy por encima del mínimo.
      hover: { size: 5, sizeOffset: 0 },
      strokeColors: '#ffffff',
      strokeWidth: 2,
    },
    xaxis: {
      categories: input.categories,
      labels: { ...AXIS_LABEL, rotate: 0, hideOverlappingLabels: true },
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false },
    },
    yaxis: {
      labels: { ...AXIS_LABEL, formatter: (value) => `${Math.round(value)}` },
      min: 0,
      // Sin decimales: son postulaciones, no hay media persona.
      forceNiceScale: true,
    },
  };
}

export interface MultiAreaSeries {
  name: string;
  values: number[];
}

/**
 * Dos o más series sobre el **mismo eje**. Nunca un segundo eje Y: dos escalas
 * distintas en una gráfica hacen que el cruce de las líneas parezca significar
 * algo, y no significa nada.
 *
 * Con dos o más series la leyenda es obligatoria — es lo que da identidad a
 * cada color — y los colores salen de `IJ_CHART_PALETTE` en su orden fijo.
 */
export function multiAreaChartOptions(
  categories: string[],
  series: MultiAreaSeries[],
  height = 300,
): ApexOptions {
  return {
    ...baseOptions(height),
    chart: { ...baseOptions(height).chart, type: 'area', stacked: false },
    series: series.map((entry) => ({ name: entry.name, data: entry.values })),
    colors: IJ_CHART_PALETTE.slice(0, series.length) as string[],
    stroke: { curve: 'smooth', width: 2.5, lineCap: 'round' },
    fill: {
      type: 'gradient',
      gradient: { opacityFrom: 0.28, opacityTo: 0.02, stops: [0, 95] },
    },
    markers: {
      size: 0,
      hover: { size: 5, sizeOffset: 0 },
      strokeColors: '#ffffff',
      strokeWidth: 2,
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
      fontSize: '12.5px',
      fontFamily: FONT,
      labels: { colors: MUTED },
      markers: { size: 6 },
      itemMargin: { horizontal: 8 },
    },
    xaxis: {
      categories,
      labels: { ...AXIS_LABEL, rotate: 0, hideOverlappingLabels: true },
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false },
    },
    yaxis: {
      labels: { ...AXIS_LABEL, formatter: (value) => `${Math.round(value)}` },
      min: 0,
      forceNiceScale: true,
    },
    // Una guía vertical con las dos series a la vez: comparar el mismo día es
    // justo lo que se quiere mirar.
    tooltip: { ...baseOptions(height).tooltip, shared: true, intersect: false },
  };
}

export interface BarChartInput {
  categories: string[];
  values: number[];
  name: string;
  /** Un color por barra; por defecto todas del mismo tono (es magnitud). */
  colors?: string[];
  horizontal?: boolean;
  height?: number;
}

/**
 * Magnitud comparada entre categorías. Por defecto **un solo tono**: las barras
 * ya se comparan por longitud, y pintar cada una de un color inventa una
 * identidad que no existe.
 */
export function barChartOptions(input: BarChartInput): ApexOptions {
  const height = input.height ?? 280;
  const horizontal = input.horizontal ?? true;
  const distributed = Boolean(input.colors);

  return {
    ...baseOptions(height),
    chart: { ...baseOptions(height).chart, type: 'bar' },
    series: [{ name: input.name, data: input.values }],
    colors: input.colors ?? [IJ_CHART_STATUS.brand],
    plotOptions: {
      bar: {
        horizontal,
        distributed,
        borderRadius: 4,
        // El radio sólo en la punta: la base queda anclada a la línea cero.
        borderRadiusApplication: 'end',
        barHeight: '62%',
        columnWidth: '52%',
      },
    },
    // Con `distributed` Apex pinta una leyenda por barra, que duplica el eje.
    legend: { show: false },
    xaxis: {
      categories: input.categories,
      labels: { ...AXIS_LABEL },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { labels: { ...AXIS_LABEL, maxWidth: 220 } },
    grid: {
      ...baseOptions(height).grid,
      xaxis: { lines: { show: horizontal } },
      yaxis: { lines: { show: !horizontal } },
    },
  };
}

export interface DonutChartInput {
  labels: string[];
  values: number[];
  colors?: string[];
  /** Número grande del centro. */
  totalLabel?: string;
  height?: number;
}

/**
 * Partes de un todo, **hasta cuatro o cinco porciones**. Con más, las porciones
 * pequeñas dejan de ser comparables: eso va en barras.
 */
export function donutChartOptions(input: DonutChartInput): ApexOptions {
  const height = input.height ?? 280;
  return {
    ...baseOptions(height),
    chart: { ...baseOptions(height).chart, type: 'donut' },
    series: input.values,
    labels: input.labels,
    colors: input.colors ?? [...IJ_CHART_PALETTE],
    // 2px de superficie entre porciones: separa sin dibujar una línea.
    stroke: { width: 2, colors: ['#ffffff'] },
    legend: {
      position: 'bottom',
      horizontalAlign: 'center',
      fontSize: '12.5px',
      fontFamily: FONT,
      labels: { colors: MUTED },
      markers: { size: 6, offsetX: -3 },
      itemMargin: { horizontal: 8, vertical: 4 },
    },
    plotOptions: {
      pie: {
        donut: {
          size: '68%',
          labels: {
            show: true,
            value: {
              fontSize: '24px',
              fontWeight: 800,
              color: INK,
              fontFamily: FONT,
              offsetY: 2,
            },
            total: {
              show: true,
              showAlways: true,
              label: input.totalLabel ?? 'Total',
              fontSize: '12px',
              fontWeight: 600,
              color: MUTED,
              fontFamily: FONT,
            },
          },
        },
      },
    },
  };
}

export interface RadialChartInput {
  /** 0–100. */
  percent: number;
  label: string;
  color?: string;
  height?: number;
}

/** Un único valor contra su tope: cupo consumido, avance de un objetivo. */
export function radialChartOptions(input: RadialChartInput): ApexOptions {
  const height = input.height ?? 240;
  return {
    ...baseOptions(height),
    chart: { ...baseOptions(height).chart, type: 'radialBar' },
    series: [Math.max(0, Math.min(100, Math.round(input.percent)))],
    labels: [input.label],
    colors: [input.color ?? IJ_CHART_STATUS.brand],
    plotOptions: {
      radialBar: {
        hollow: { size: '62%' },
        track: { background: LINE, strokeWidth: '100%' },
        dataLabels: {
          name: {
            fontSize: '12px',
            fontFamily: FONT,
            color: MUTED,
            offsetY: 22,
          },
          value: {
            fontSize: '28px',
            fontWeight: 800,
            fontFamily: FONT,
            color: INK,
            offsetY: -14,
            formatter: (value: number) => `${Math.round(value)}%`,
          },
        },
      },
    },
    stroke: { lineCap: 'round' },
  };
}

/** Línea mínima para una tarjeta de indicador: sin ejes, sin rejilla. */
export function sparklineOptions(
  values: number[],
  color = IJ_CHART_STATUS.brand,
): ApexOptions {
  return {
    chart: {
      type: 'area',
      height: 48,
      sparkline: { enabled: true },
      fontFamily: FONT,
      animations: { enabled: true, speed: 500 },
    },
    series: [{ name: 'Tendencia', data: values }],
    colors: [color],
    stroke: { curve: 'smooth', width: 2, lineCap: 'round' },
    fill: {
      type: 'gradient',
      gradient: { opacityFrom: 0.28, opacityTo: 0, stops: [0, 100] },
    },
    tooltip: { enabled: false },
  };
}
