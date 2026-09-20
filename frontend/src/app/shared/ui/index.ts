export { IjIcon, type IconName } from '@/shared/ui/icon/icon';
export { IjButton } from '@/shared/ui/button/button';
export { IjAvatar } from '@/shared/ui/avatar/avatar';
export { IjBadge } from '@/shared/ui/badge/badge';
export { IjLogo } from '@/shared/ui/logo/logo';
export { IjSpinner } from '@/shared/ui/spinner/spinner';
export { IjModal } from '@/shared/ui/modal/modal';
// Render del texto de la vacante: HTML del editor o texto plano antiguo (T32).
export { IjRichText } from '@/shared/ui/rich-text/rich-text';
export { IjPricingCard } from '@/shared/ui/pricing-card/pricing-card';
export { IjPageHeader } from '@/shared/ui/page-header/page-header';
export {
  IjPdfViewer,
  type IjPdfFile,
} from '@/shared/ui/pdf-viewer/pdf-viewer';
export { TONE_SOFT, TONE_TEXT, type Tone } from '@/shared/ui/tone';

// Controles de formulario (CVA + Tailwind + CDK)
export { IjInput } from '@/shared/ui/input/input';
export { IjTextarea } from '@/shared/ui/textarea/textarea';
// Editor enriquecido (T32). Sólo para áreas cliente: CKEditor necesita `window`.
export { IjEditor } from '@/shared/ui/editor/editor';
export { IjPasswordStrength } from '@/shared/ui/password-strength/password-strength';
export { IjSelect } from '@/shared/ui/select/select';
// Teléfono con indicativo de país (T36). El valor es un objeto, no la cadena
// E.164: `+1` es Estados Unidos y Canadá a la vez.
export {
  IjPhoneInput,
  type IjPhoneValue,
} from '@/shared/ui/phone-input/phone-input';
export { IjMultiselect } from '@/shared/ui/multiselect/multiselect';
export { IjAutocomplete } from '@/shared/ui/autocomplete/autocomplete';
export { IjDatepicker } from '@/shared/ui/datepicker/datepicker';
export { type IjOption } from '@/shared/ui/forms/option';

// Piezas de los paneles de inicio, compartidas por las tres áreas.
export { IjKpiCard, type IjKpiTone } from '@/shared/ui/kpi-card/kpi-card';
export { IjDashboardCard } from '@/shared/ui/dashboard-card/dashboard-card';

// Gráficas de los paneles (ApexCharts, cargado bajo demanda en el navegador).
export { IjChart } from '@/shared/ui/chart/chart';
export {
  IJ_CHART_PALETTE,
  IJ_CHART_STATUS,
  areaChartOptions,
  multiAreaChartOptions,
  barChartOptions,
  donutChartOptions,
  radialChartOptions,
  sparklineOptions,
} from '@/shared/ui/chart/chart-theme';

// Tabla del back-office: TanStack Table headless + marcado del kit.
export { IjTable } from '@/shared/ui/table/table';
export { IjCell } from '@/shared/ui/table/cell.directive';
export {
  type IjColumn,
  type IjSortState,
  type IjSortOrder,
  type IjCellContext,
} from '@/shared/ui/table/table.models';
