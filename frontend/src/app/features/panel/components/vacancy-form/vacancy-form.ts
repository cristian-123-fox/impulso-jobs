import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { IjButton, IjIcon } from '@/shared/ui';
import { PanelFacade } from '@/features/panel/data/panel.facade';
import { VacancyFormValue } from '@/features/panel/models/panel.models';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const MSHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const PANEL =
  'absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-[250px] overflow-y-auto ' +
  'rounded-xl border border-line bg-white p-1.5 shadow-float';

interface DayCell {
  readonly blank: boolean;
  readonly label: string;
  readonly iso?: string;
  readonly selected?: boolean;
}

/**
 * "Nueva vacante": formulario con widgets propios (Typeahead, Select2 simple y
 * múltiple, Datepicker), gestionados con señales. Un único dropdown abierto a la
 * vez; un backdrop cierra el que esté abierto.
 */
@Component({
  selector: 'app-vacancy-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjIcon, IjButton],
  template: `
    <div class="relative">
      @if (open()) {
        <div class="fixed inset-0 z-20" (click)="close()"></div>
      }

      <div class="max-w-[920px] rounded-2xl bg-white p-6 shadow-card sm:p-7">
        <div class="grid gap-5 md:grid-cols-2">
          <!-- Typeahead: título -->
          <div [class]="wrapClass('titulo')">
            <label class="mb-2 block text-[13px] font-bold text-ink-900">
              Título del cargo <span class="font-semibold text-muted">· Typeahead</span>
            </label>
            <input
              class="h-12 w-full rounded-xl border bg-white px-3.5 text-sm text-ink-900 outline-none transition-colors"
              [class]="open() === 'titulo' ? 'border-brand ring-[3px] ring-brand/15' : 'border-line hover:border-brand/40'"
              placeholder="Escribe para buscar…"
              [value]="form().titulo"
              (input)="onTypeahead('titulo', $any($event.target).value)"
              (focus)="open.set('titulo')"
            />
            @if (open() === 'titulo') {
              <div [class]="panel">
                @if (!tituloSug().length) {
                  <div class="p-3 text-[13px] text-muted">Sin sugerencias</div>
                }
                @for (o of tituloSug(); track o) {
                  <div
                    class="cursor-pointer rounded-lg px-3 py-2.5 text-[13.5px] text-ink-900 hover:bg-surface"
                    (click)="pick('titulo', o)"
                  >
                    {{ o }}
                  </div>
                }
              </div>
            }
          </div>

          <!-- Typeahead: ciudad -->
          <div [class]="wrapClass('ciudad')">
            <label class="mb-2 block text-[13px] font-bold text-ink-900">
              Ciudad / ubicación <span class="font-semibold text-muted">· Typeahead</span>
            </label>
            <input
              class="h-12 w-full rounded-xl border bg-white px-3.5 text-sm text-ink-900 outline-none transition-colors"
              [class]="open() === 'ciudad' ? 'border-brand ring-[3px] ring-brand/15' : 'border-line hover:border-brand/40'"
              placeholder="Escribe para buscar…"
              [value]="form().ciudad"
              (input)="onTypeahead('ciudad', $any($event.target).value)"
              (focus)="open.set('ciudad')"
            />
            @if (open() === 'ciudad') {
              <div [class]="panel">
                @if (!ciudadSug().length) {
                  <div class="p-3 text-[13px] text-muted">Sin sugerencias</div>
                }
                @for (o of ciudadSug(); track o) {
                  <div
                    class="cursor-pointer rounded-lg px-3 py-2.5 text-[13.5px] text-ink-900 hover:bg-surface"
                    (click)="pick('ciudad', o)"
                  >
                    {{ o }}
                  </div>
                }
              </div>
            }
          </div>

          <!-- Select2 single: categoría -->
          <div [class]="wrapClass('cat')">
            <label class="mb-2 block text-[13px] font-bold text-ink-900">
              Categoría <span class="font-semibold text-muted">· Select2</span>
            </label>
            <div [class]="controlClass('cat')" (click)="toggle('cat')">
              <span class="flex-1 truncate" [class]="form().categoria ? 'font-semibold text-ink-900' : 'text-muted'">
                {{ form().categoria || 'Selecciona una categoría' }}
              </span>
              <ij-icon name="chevron-down" [size]="16" class="text-muted" />
            </div>
            @if (open() === 'cat') {
              <div [class]="panel">
                <input
                  class="mb-1 w-full border-b border-line px-2.5 pb-3 pt-1 text-[13.5px] text-ink-900 outline-none"
                  placeholder="Buscar…"
                  [value]="q()"
                  (click)="$event.stopPropagation()"
                  (input)="q.set($any($event.target).value)"
                />
                @if (!catOpts().length) {
                  <div class="p-3 text-[13px] text-muted">Sin resultados</div>
                }
                @for (o of catOpts(); track o) {
                  <div [class]="optClass(form().categoria === o)" (click)="pick('categoria', o)">
                    <span>{{ o }}</span>
                    @if (form().categoria === o) {
                      <span class="text-brand"><ij-icon name="check" [size]="15" [strokeWidth]="2.6" /></span>
                    }
                  </div>
                }
              </div>
            }
          </div>

          <!-- Datepicker: fecha de cierre -->
          <div [class]="wrapClass('dp')">
            <label class="mb-2 block text-[13px] font-bold text-ink-900">
              Fecha de cierre <span class="font-semibold text-muted">· Datepicker</span>
            </label>
            <div [class]="controlClass('dp')" (click)="toggle('dp')">
              <ij-icon name="calendar" [size]="17" class="text-muted" />
              <span class="flex-1" [class]="dpDisplay() ? 'font-semibold text-ink-900' : 'text-muted'">
                {{ dpDisplay() || 'Selecciona una fecha' }}
              </span>
            </div>
            @if (open() === 'dp') {
              <div
                class="absolute left-0 right-0 top-[calc(100%+6px)] z-50 rounded-xl border border-line bg-white p-3.5 shadow-float"
              >
                <div class="mb-2.5 flex items-center justify-between">
                  <button
                    type="button"
                    aria-label="Mes anterior"
                    class="flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-line text-body hover:bg-surface"
                    (click)="dpShift(-1)"
                  >
                    <ij-icon name="chevron-left" [size]="15" />
                  </button>
                  <span class="text-[13.5px] font-bold text-ink-900">{{ dpMonthLabel() }}</span>
                  <button
                    type="button"
                    aria-label="Mes siguiente"
                    class="flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-line text-body hover:bg-surface"
                    (click)="dpShift(1)"
                  >
                    <ij-icon name="chevron-right" [size]="15" />
                  </button>
                </div>
                <div class="mb-1 grid grid-cols-7 gap-0.5">
                  @for (w of weekdays; track w) {
                    <span class="py-1 text-center text-[11px] font-bold text-muted">{{ w }}</span>
                  }
                </div>
                <div class="grid grid-cols-7 gap-0.5">
                  @for (c of dpCells(); track $index) {
                    @if (c.blank) {
                      <span></span>
                    } @else {
                      <button
                        type="button"
                        class="flex h-[34px] items-center justify-center rounded-lg text-[13px] transition-colors"
                        [class]="c.selected ? 'bg-brand font-bold text-white' : 'font-medium text-ink-900 hover:bg-surface'"
                        (click)="pickFecha(c.iso!)"
                      >
                        {{ c.label }}
                      </button>
                    }
                  }
                </div>
              </div>
            }
          </div>

          <!-- Select2 multi: habilidades -->
          <div class="md:col-span-2" [class]="wrapClass('hab')">
            <label class="mb-2 block text-[13px] font-bold text-ink-900">
              Habilidades requeridas
              <span class="font-semibold text-muted">· Select2 (múltiple)</span>
            </label>
            <div [class]="controlClass('hab') + ' flex-wrap'" (click)="toggle('hab')">
              @if (form().habilidades.length) {
                @for (h of form().habilidades; track h) {
                  <span
                    class="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 py-1 pl-2.5 pr-1.5 text-[12.5px] font-semibold text-brand"
                  >
                    {{ h }}
                    <span
                      class="inline-flex h-[17px] w-[17px] cursor-pointer items-center justify-center rounded bg-brand/15 leading-none text-brand"
                      (click)="removeHab(h, $event)"
                    >
                      ×
                    </span>
                  </span>
                }
              } @else {
                <span class="flex-1 text-muted">Selecciona una o varias…</span>
              }
              <ij-icon name="chevron-down" [size]="16" class="ml-auto text-muted" />
            </div>
            @if (open() === 'hab') {
              <div [class]="panel">
                <input
                  class="mb-1 w-full border-b border-line px-2.5 pb-3 pt-1 text-[13.5px] text-ink-900 outline-none"
                  placeholder="Buscar habilidad…"
                  [value]="q()"
                  (click)="$event.stopPropagation()"
                  (input)="q.set($any($event.target).value)"
                />
                @if (!habOpts().length) {
                  <div class="p-3 text-[13px] text-muted">Sin resultados</div>
                }
                @for (o of habOpts(); track o) {
                  <div [class]="optClass(form().habilidades.includes(o))" (click)="toggleHab(o, $event)">
                    <span>{{ o }}</span>
                    @if (form().habilidades.includes(o)) {
                      <span class="text-brand"><ij-icon name="check" [size]="15" [strokeWidth]="2.6" /></span>
                    }
                  </div>
                }
              </div>
            }
          </div>

          <!-- Select2 single: modalidad -->
          <div [class]="wrapClass('mod')">
            <label class="mb-2 block text-[13px] font-bold text-ink-900">
              Modalidad <span class="font-semibold text-muted">· Select2</span>
            </label>
            <div [class]="controlClass('mod')" (click)="toggle('mod')">
              <span class="flex-1 truncate" [class]="form().modalidad ? 'font-semibold text-ink-900' : 'text-muted'">
                {{ form().modalidad || 'Selecciona modalidad' }}
              </span>
              <ij-icon name="chevron-down" [size]="16" class="text-muted" />
            </div>
            @if (open() === 'mod') {
              <div [class]="panel">
                @for (o of facade.modalidades; track o) {
                  <div [class]="optClass(form().modalidad === o)" (click)="pick('modalidad', o)">
                    <span>{{ o }}</span>
                    @if (form().modalidad === o) {
                      <span class="text-brand"><ij-icon name="check" [size]="15" [strokeWidth]="2.6" /></span>
                    }
                  </div>
                }
              </div>
            }
          </div>

          <!-- Select2 single: tipo -->
          <div [class]="wrapClass('tipo')">
            <label class="mb-2 block text-[13px] font-bold text-ink-900">
              Tipo de empleo <span class="font-semibold text-muted">· Select2</span>
            </label>
            <div [class]="controlClass('tipo')" (click)="toggle('tipo')">
              <span class="flex-1 truncate" [class]="form().tipo ? 'font-semibold text-ink-900' : 'text-muted'">
                {{ form().tipo || 'Selecciona tipo de empleo' }}
              </span>
              <ij-icon name="chevron-down" [size]="16" class="text-muted" />
            </div>
            @if (open() === 'tipo') {
              <div [class]="panel">
                @for (o of facade.tipos; track o) {
                  <div [class]="optClass(form().tipo === o)" (click)="pick('tipo', o)">
                    <span>{{ o }}</span>
                    @if (form().tipo === o) {
                      <span class="text-brand"><ij-icon name="check" [size]="15" [strokeWidth]="2.6" /></span>
                    }
                  </div>
                }
              </div>
            }
          </div>
        </div>

        <div class="mt-7 flex justify-end gap-3 border-t border-line pt-5">
          <button
            type="button"
            class="rounded-xl border border-line bg-white px-5 py-2.5 text-[13.5px] font-bold text-body transition-colors hover:bg-surface"
            (click)="navigate.emit('vacantes')"
          >
            Cancelar
          </button>
          <button ij-button type="button" variant="primary" shape="rounded" size="md" class="shadow-search">
            Publicar vacante
          </button>
        </div>
      </div>
    </div>
  `,
})
export class VacancyForm {
  readonly navigate = output<string>();
  protected readonly facade = inject(PanelFacade);
  protected readonly panel = PANEL;
  protected readonly weekdays = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];

  protected readonly form = signal<VacancyFormValue>({
    titulo: '',
    ciudad: '',
    categoria: '',
    fecha: '',
    modalidad: '',
    tipo: '',
    habilidades: [],
  });
  protected readonly open = signal<string | null>(null);
  protected readonly q = signal('');
  protected readonly dpY = signal(2026);
  protected readonly dpM = signal(7);

  // ---- sugerencias / opciones ----
  protected readonly tituloSug = computed(() => {
    const v = this.form().titulo.toLowerCase();
    const src = this.facade.titulos;
    return (v ? src.filter((t) => t.toLowerCase().includes(v) && t.toLowerCase() !== v) : src).slice(0, 6);
  });
  protected readonly ciudadSug = computed(() => {
    const v = this.form().ciudad.toLowerCase();
    const src = this.facade.ciudades;
    return (v ? src.filter((c) => c.toLowerCase().includes(v) && c.toLowerCase() !== v) : src).slice(0, 6);
  });
  protected readonly catOpts = computed(() => {
    const q = this.q().toLowerCase();
    return this.facade.categorias.filter((c) => c.toLowerCase().includes(q));
  });
  protected readonly habOpts = computed(() => {
    const q = this.q().toLowerCase();
    return this.facade.habilidades.filter((s) => s.toLowerCase().includes(q));
  });

  // ---- datepicker ----
  protected readonly dpCells = computed<DayCell[]>(() => {
    const y = this.dpY();
    const m = this.dpM();
    const startIdx = (new Date(y, m, 1).getDay() + 6) % 7;
    const days = new Date(y, m + 1, 0).getDate();
    const fecha = this.form().fecha;
    const cells: DayCell[] = [];
    for (let i = 0; i < startIdx; i++) cells.push({ blank: true, label: '' });
    for (let d = 1; d <= days; d++) {
      const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ blank: false, label: String(d), iso, selected: fecha === iso });
    }
    return cells;
  });
  protected readonly dpMonthLabel = computed(() => `${MONTHS[this.dpM()]} ${this.dpY()}`);
  protected readonly dpDisplay = computed(() => {
    const f = this.form().fecha;
    if (!f) return '';
    const [yy, mm, dd] = f.split('-');
    return `${parseInt(dd, 10)} ${MSHORT[parseInt(mm, 10) - 1]} ${yy}`;
  });

  // ---- estilos ----
  protected wrapClass(key: string): string {
    return `relative ${this.open() === key ? 'z-40' : 'z-[1]'}`;
  }
  protected controlClass(key: string): string {
    const base =
      'flex min-h-[48px] w-full cursor-pointer items-center gap-2 rounded-xl border bg-white px-3.5 py-2.5 text-sm transition-colors';
    return this.open() === key
      ? `${base} border-brand ring-[3px] ring-brand/15`
      : `${base} border-line hover:border-brand/40`;
  }
  protected optClass(active: boolean): string {
    const base =
      'flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-[13.5px] transition-colors';
    return active
      ? `${base} bg-surface font-bold text-brand`
      : `${base} font-medium text-ink-900 hover:bg-surface`;
  }

  // ---- handlers ----
  protected toggle(key: string): void {
    this.open.update((o) => (o === key ? null : key));
    this.q.set('');
  }
  protected close(): void {
    this.open.set(null);
  }
  protected pick(field: keyof VacancyFormValue, value: string): void {
    this.form.update((f) => ({ ...f, [field]: value }));
    this.open.set(null);
  }
  protected pickFecha(iso: string): void {
    this.form.update((f) => ({ ...f, fecha: iso }));
    this.open.set(null);
  }
  protected onTypeahead(field: 'titulo' | 'ciudad', value: string): void {
    this.form.update((f) => ({ ...f, [field]: value }));
    this.open.set(field);
  }
  protected toggleHab(skill: string, event: Event): void {
    event.stopPropagation();
    this.form.update((f) => ({
      ...f,
      habilidades: f.habilidades.includes(skill)
        ? f.habilidades.filter((x) => x !== skill)
        : [...f.habilidades, skill],
    }));
  }
  protected removeHab(skill: string, event: Event): void {
    event.stopPropagation();
    this.form.update((f) => ({
      ...f,
      habilidades: f.habilidades.filter((x) => x !== skill),
    }));
  }
  protected dpShift(delta: number): void {
    let m = this.dpM() + delta;
    let y = this.dpY();
    if (m < 0) {
      m = 11;
      y--;
    }
    if (m > 11) {
      m = 0;
      y++;
    }
    this.dpM.set(m);
    this.dpY.set(y);
  }
}
