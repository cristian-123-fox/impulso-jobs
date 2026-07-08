import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { IjButton, IjIcon, TONE_SOFT } from '@/shared/ui';
import { JobSearchCriteria, Stat } from '@/features/public/home/models/home.models';
import { MediaFrame } from '@/features/public/home/components/media-frame/media-frame';

/** Hero con titular, buscador de empleos y tarjetas flotantes de estadísticas. */
@Component({
  selector: 'app-hero-search',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, IjIcon, IjButton, MediaFrame],
  template: `
    <section class="relative overflow-hidden bg-surface px-6 pb-24 pt-10 lg:px-[60px]">
      <!-- Decoraciones -->
      <div
        class="pointer-events-none absolute -right-20 -top-28 h-[520px] w-[520px] rounded-full bg-brand/[0.06]"
        aria-hidden="true"
      ></div>
      <div
        class="pointer-events-none absolute -left-16 bottom-16 hidden h-56 w-56 rounded-full border-[38px] border-brand/[0.05] lg:block"
        aria-hidden="true"
      ></div>
      <span
        class="pointer-events-none absolute bottom-10 left-[38%] hidden select-none text-[150px] font-extrabold leading-none tracking-widest text-brand/[0.05] lg:block"
        aria-hidden="true"
        >JOBS</span
      >

      <div
        class="relative z-[2] mx-auto grid max-w-container items-center gap-10 lg:grid-cols-[1.05fr_1fr]"
      >
        <!-- Copy + buscador -->
        <div>
          <p class="mb-3.5 text-[15px] text-muted">
            Tenemos <span class="font-semibold text-brand">208.000+</span> empleos
            activos
          </p>
          <h1
            class="mb-5 text-4xl font-bold leading-[1.15] text-ink-900 sm:text-[52px]"
          >
            Encuentra el <span class="text-brand">empleo</span> que se ajusta a tu
            vida
          </h1>
          <p class="mb-8 text-base text-muted">
            Escribe una palabra clave y encuentra el empleo perfecto para ti.
          </p>

          <form
            class="flex flex-col gap-2 rounded-xl bg-white p-4 shadow-search sm:flex-row sm:items-center sm:gap-0"
            [formGroup]="form"
            (ngSubmit)="submit()"
          >
            <label class="flex-1 px-4 py-1 sm:border-r sm:border-line">
              <span
                class="mb-0.5 block text-[11px] font-semibold uppercase tracking-wide text-muted"
                >Empleo</span
              >
              <input
                type="text"
                formControlName="query"
                placeholder="Cargo o palabra clave"
                class="w-full border-0 p-0 text-sm text-body placeholder:text-muted focus:ring-0"
              />
            </label>

            <label class="flex-1 px-4 py-1 sm:border-r sm:border-line">
              <span
                class="mb-0.5 block text-[11px] font-semibold uppercase tracking-wide text-muted"
                >Categoría</span
              >
              <select
                formControlName="category"
                class="w-full border-0 bg-transparent p-0 text-sm text-body focus:ring-0"
              >
                <option value="">Todas las categorías</option>
                @for (option of categoryOptions(); track option) {
                  <option [value]="option">{{ option }}</option>
                }
              </select>
            </label>

            <label class="flex-1 px-4 py-1">
              <span
                class="mb-0.5 block text-[11px] font-semibold uppercase tracking-wide text-muted"
                >Ubicación</span
              >
              <input
                type="text"
                formControlName="location"
                placeholder="Ciudad o región"
                class="w-full border-0 p-0 text-sm text-body placeholder:text-muted focus:ring-0"
              />
            </label>

            <button ij-button type="submit" shape="rounded" size="lg">
              Buscar empleo
            </button>
          </form>

          <p class="mt-4 text-[13px] text-muted">
            <span class="font-semibold text-body">Búsquedas populares:</span>
            {{ popularSearches().join(' , ') }} ...
          </p>
        </div>

        <!-- Imagen + tarjetas flotantes -->
        <div class="relative hidden h-[520px] lg:block">
          <div
            class="absolute left-[8%] top-5 h-[480px] w-[84%] rounded-full bg-gradient-to-b from-accent-blue-soft to-surface"
          ></div>
          <div class="absolute bottom-0 left-[6%] h-[500px] w-[88%] overflow-hidden rounded-t-full">
            <app-media-frame icon="user" label="Foto principal" />
          </div>

          @for (stat of stats(); track stat.label; let i = $index) {
            <div [class]="cardPosition(i)">
              @if (stat.icon; as icon) {
                <div [class]="'flex h-10 w-10 items-center justify-center rounded-[10px] ' + toneClass(stat.tone)">
                  <ij-icon [name]="icon" [size]="20" />
                </div>
              } @else {
                <div class="flex">
                  <span class="h-[26px] w-[26px] rounded-full border-2 border-white bg-accent-amber"></span>
                  <span class="-ml-2.5 h-[26px] w-[26px] rounded-full border-2 border-white bg-accent-blue"></span>
                  <span class="-ml-2.5 h-[26px] w-[26px] rounded-full border-2 border-white bg-accent-green"></span>
                  <span class="-ml-2.5 h-[26px] w-[26px] rounded-full border-2 border-white bg-accent-pink"></span>
                </div>
              }
              <div>
                <div class="text-xl font-bold text-ink-900">{{ stat.value }}</div>
                <div class="text-xs text-muted">{{ stat.label }}</div>
              </div>
            </div>
          }
        </div>
      </div>
    </section>
  `,
})
export class HeroSearch {
  readonly stats = input.required<readonly Stat[]>();
  readonly popularSearches = input.required<readonly string[]>();
  readonly categoryOptions = input.required<readonly string[]>();

  readonly search = output<JobSearchCriteria>();

  protected readonly form = new FormGroup({
    query: new FormControl('', { nonNullable: true }),
    category: new FormControl('', { nonNullable: true }),
    location: new FormControl('', { nonNullable: true }),
  });

  private readonly positions = [
    'absolute left-[-6%] top-[120px] flex items-center gap-3 rounded-xl bg-white px-4 py-3.5 shadow-float',
    'absolute right-[-4%] top-11 flex items-center gap-3 rounded-xl bg-white px-4 py-3.5 shadow-float',
    'absolute bottom-8 right-[-2%] flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-float',
  ];

  protected cardPosition(index: number): string {
    return this.positions[index] ?? this.positions[0];
  }

  protected toneClass(tone: Stat['tone']): string {
    return TONE_SOFT[tone ?? 'brand'];
  }

  protected submit(): void {
    this.search.emit(this.form.getRawValue());
  }
}
