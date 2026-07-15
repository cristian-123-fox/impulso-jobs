import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

/** Nombres de icono disponibles en el UI Kit (line icons 24x24). */
export type IconName =
  | 'search'
  | 'login'
  | 'plus'
  | 'check'
  | 'x'
  | 'chart'
  | 'clipboard'
  | 'pen'
  | 'code'
  | 'resume'
  | 'phone'
  | 'mail'
  | 'chevron-down'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-up'
  | 'map-pin'
  | 'building'
  | 'globe'
  | 'arrow-up'
  | 'calendar'
  | 'user'
  | 'image'
  | 'menu'
  | 'close'
  | 'headset'
  | 'bank'
  | 'share'
  | 'palette'
  | 'grid'
  | 'flash'
  | 'orbit'
  | 'leaf'
  | 'eye'
  | 'eye-off'
  | 'alert-triangle'
  | 'home'
  | 'briefcase'
  | 'users'
  | 'tag'
  | 'shield'
  | 'settings'
  | 'file'
  | 'credit-card'
  | 'send'
  | 'dollar'
  | 'award'
  | 'clock'
  | 'pause'
  | 'list'
  | 'history'
  | 'bell'
  | 'logout';

/**
 * Forma SVG primitiva. Se modela como interfaz plana (no unión discriminada)
 * para que las plantillas puedan leer cualquier campo sin narrowing.
 */
interface IconShape {
  readonly t: 'path' | 'circle' | 'rect' | 'ellipse';
  readonly d?: string;
  readonly cx?: number;
  readonly cy?: number;
  readonly r?: number;
  readonly rx?: number;
  readonly ry?: number;
  readonly x?: number;
  readonly y?: number;
  readonly w?: number;
  readonly h?: number;
  /** true → relleno con currentColor y sin trazo (para puntos/manchas). */
  readonly fill?: boolean;
}

const p = (d: string): IconShape => ({ t: 'path', d });
const c = (cx: number, cy: number, r: number, fill = false): IconShape => ({
  t: 'circle',
  cx,
  cy,
  r,
  fill,
});
const r = (
  x: number,
  y: number,
  w: number,
  h: number,
  rx?: number,
): IconShape => ({ t: 'rect', x, y, w, h, rx });

/** Definición estructural de cada icono, dibujada sobre un `<svg>` 24x24. */
const ICONS: Record<IconName, readonly IconShape[]> = {
  search: [c(11, 11, 7), p('M21 21l-4-4')],
  login: [
    p('M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4'),
    p('M10 17l5-5-5-5'),
    p('M15 12H3'),
  ],
  plus: [p('M12 5v14M5 12h14')],
  check: [p('M20 6L9 17l-5-5')],
  x: [p('M18 6L6 18M6 6l12 12')],
  chart: [p('M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6'), c(17, 6, 2)],
  clipboard: [r(6, 4, 12, 17, 2), p('M9 3h6v3H9zM9 11h6M9 15h4')],
  pen: [
    p('M6 3h9l3 3v15H6z'),
    p('M9 8h6M9 12h6M9 16h3'),
    p('M18 14l3 3-4 4-3 1 1-3z'),
  ],
  code: [
    r(3, 4, 18, 14, 2),
    p('M9 21h6M12 18v3'),
    p('M8 9l-2 2 2 2M16 9l2 2-2 2'),
  ],
  resume: [
    r(5, 3, 14, 18, 2),
    c(12, 9, 2.5),
    p('M8 17c0-2 2-3 4-3s4 1 4 3'),
  ],
  phone: [p('M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7l.5 3.5a2 2 0 0 1-.6 1.8l-2 2a16 16 0 0 0 6 6l2-2a2 2 0 0 1 1.8-.6l3.5.5a2 2 0 0 1 1.7 2z')],
  mail: [r(3, 5, 18, 14, 2), p('M3 7l9 6 9-6')],
  'chevron-down': [p('M6 9l6 6 6-6')],
  'chevron-left': [p('M15 18l-6-6 6-6')],
  'chevron-right': [p('M9 18l6-6-6-6')],
  'chevron-up': [p('M6 15l6-6 6 6')],
  'map-pin': [
    p('M12 21s-7-5.6-7-11a7 7 0 0 1 14 0c0 5.4-7 11-7 11z'),
    c(12, 10, 2.5),
  ],
  building: [p('M3 21h18M6 21V8l6-4 6 4v13'), p('M10 12h4M10 16h4')],
  globe: [c(12, 12, 9), p('M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18')],
  'arrow-up': [p('M12 19V6M5 12l7-7 7 7')],
  calendar: [r(3, 4, 18, 18, 2), p('M3 10h18M8 2v4M16 2v4')],
  user: [c(12, 8, 4), p('M4 21c0-4 3.5-6 8-6s8 2 8 6')],
  image: [r(3, 3, 18, 18, 2), c(8.5, 8.5, 1.5), p('M21 15l-5-5L5 21')],
  menu: [p('M3 6h18M3 12h18M3 18h18')],
  close: [p('M6 6l12 12M18 6L6 18')],
  headset: [
    p('M4 14v-2a8 8 0 0 1 16 0v2'),
    r(2, 14, 4, 6, 2),
    r(18, 14, 4, 6, 2),
    p('M20 18v1a3 3 0 0 1-3 3h-3'),
  ],
  bank: [p('M3 21h18M4 21V9l8-5 8 5v12M9 21v-6h6v6')],
  share: [
    c(6, 12, 2.5),
    c(18, 6, 2.5),
    c(18, 18, 2.5),
    p('M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6'),
  ],
  palette: [
    c(12, 12, 9),
    c(8, 9, 1.2, true),
    c(15, 8, 1.2, true),
    c(16, 13, 1.2, true),
    p('M12 21c-1 0-2-1-2-2s1-2 0-3'),
  ],
  grid: [r(4, 4, 6, 6, 1), r(14, 4, 6, 6, 1), r(4, 14, 6, 6, 1), r(14, 14, 6, 6, 1)],
  flash: [p('M13 2L4 14h7l-1 8 9-12h-7z')],
  orbit: [c(12, 12, 4), { t: 'ellipse', cx: 12, cy: 12, rx: 10, ry: 4 }],
  leaf: [p('M4 20c8 0 16-6 16-16-8 0-16 6-16 16z'), p('M4 20c4-6 8-9 12-11')],
  eye: [p('M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7z'), c(12, 12, 2.6)],
  'eye-off': [
    p('M3 3l18 18'),
    p('M10.6 10.7a2 2 0 0 0 2.8 2.8'),
    p('M9.4 5.2A9.6 9.6 0 0 1 12 5c5.5 0 9 5 9 7a12 12 0 0 1-2.2 3'),
    p('M6.2 6.2C3.9 7.6 3 10.4 3 11c0 1 1.6 4.2 5 5.6'),
  ],
  'alert-triangle': [
    p('M10.3 3.9 2.4 17.4A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3.1L13.7 3.9a2 2 0 0 0-3.4 0z'),
    p('M12 9v4'),
    p('M12 17h.01'),
  ],
  home: [p('M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5')],
  briefcase: [p('M4 8h16v11H4zM9 8V5h6v3M4 13h16')],
  users: [
    p('M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2'),
    c(9, 6.5, 3.5),
    p('M22 20v-2a4 4 0 0 0-3-3.8'),
  ],
  tag: [p('M3 12V4h8l9 9-8 8-9-9z'), p('M7.5 7.5h.01')],
  shield: [p('M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z')],
  settings: [
    c(12, 12, 3),
    p('M4.5 12a7.5 7.5 0 0 0 .1 1.3l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 2.2 1.3l.4 2.6h4l.4-2.6a7.6 7.6 0 0 0 2.2-1.3l2.4 1 2-3.4-2-1.6a7.5 7.5 0 0 0 0-2.6l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2.2-1.3L14 2.4h-4l-.4 2.6a7.6 7.6 0 0 0-2.2 1.3l-2.4-1-2 3.4 2 1.6A7.5 7.5 0 0 0 4.5 12z'),
  ],
  file: [p('M6 2h8l4 4v16H6z'), p('M14 2v4h4'), p('M9 13h6M9 17h6')],
  'credit-card': [r(2, 7, 20, 10, 2), p('M2 11h20M6 15h3')],
  send: [p('M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z')],
  dollar: [p('M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6')],
  award: [c(12, 9, 6), p('M8.5 13.5 7 22l5-3 5 3-1.5-8.5')],
  clock: [c(12, 12, 9), p('M12 7v5l3 2')],
  pause: [p('M9 5v14M15 5v14')],
  list: [p('M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01')],
  history: [p('M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2')],
  bell: [p('M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0')],
  logout: [
    p('M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4'),
    p('M16 17l5-5-5-5'),
    p('M21 12H9'),
  ],
};

/**
 * Icono SVG del UI Kit. Hereda el color vía `currentColor`, así que se controla
 * con utilidades `text-*` de Tailwind desde el contenedor. Se renderiza de forma
 * estructural (compatible con SSR/prerender, sin `innerHTML`).
 *
 * Uso: `<ij-icon name="search" [size]="18" />`
 */
@Component({
  selector: 'ij-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex shrink-0 items-center justify-center' },
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      [attr.stroke-width]="strokeWidth()"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      @for (shape of shapes(); track $index) {
        @switch (shape.t) {
          @case ('path') {
            <svg:path
              [attr.d]="shape.d"
              [attr.fill]="shape.fill ? 'currentColor' : null"
              [attr.stroke]="shape.fill ? 'none' : null"
            />
          }
          @case ('circle') {
            <svg:circle
              [attr.cx]="shape.cx"
              [attr.cy]="shape.cy"
              [attr.r]="shape.r"
              [attr.fill]="shape.fill ? 'currentColor' : null"
              [attr.stroke]="shape.fill ? 'none' : null"
            />
          }
          @case ('rect') {
            <svg:rect
              [attr.x]="shape.x"
              [attr.y]="shape.y"
              [attr.width]="shape.w"
              [attr.height]="shape.h"
              [attr.rx]="shape.rx ?? null"
            />
          }
          @case ('ellipse') {
            <svg:ellipse
              [attr.cx]="shape.cx"
              [attr.cy]="shape.cy"
              [attr.rx]="shape.rx"
              [attr.ry]="shape.ry"
            />
          }
        }
      }
    </svg>
  `,
})
export class IjIcon {
  readonly name = input.required<IconName>();
  readonly size = input(20);
  readonly strokeWidth = input(2);

  protected readonly shapes = computed<readonly IconShape[]>(
    () => ICONS[this.name()] ?? [],
  );
}
