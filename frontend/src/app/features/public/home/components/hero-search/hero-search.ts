import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslocoDirective } from '@jsverse/transloco';
import { IjButton, IjIcon, TONE_SOFT } from '@/shared/ui';
import { MX_STATES } from '@/shared/catalogs/mx.catalogs';
import { PROFESSIONAL_AREAS } from '@/shared/catalogs/professional-areas.catalogs';
import { VacancyCard } from '@/features/public/vacancies/components/vacancy-card/vacancy-card';
import { PublicVacancy } from '@/features/public/vacancies/models/public-vacancies.models';
import {
  HeroStat,
  JobSearchCriteria,
  LoadState,
} from '@/features/public/home/models/home.models';

/** Cuántas vacantes se asoman en el hero. Dos caben sin empujar el pliegue. */
const PREVIEW_COUNT = 2;

/**
 * Hero: titular, buscador y una muestra del producto.
 *
 * La columna derecha enseña **vacantes reales**, renderizadas con la misma
 * `app-vacancy-card` del listado. Antes había un marco de degradado con un
 * icono dentro, esperando una foto que nunca llegó; y una foto de stock
 * genérica tampoco diría nada de un portal de empleo. Lo que sí lo dice es la
 * propia oferta: es el producto, sale de la API y se mantiene sola.
 */
@Component({
  selector: 'app-hero-search',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    IjIcon,
    IjButton,
    VacancyCard,
    TranslocoDirective,
  ],
  templateUrl: './hero-search.html',
})
export class HeroSearch {
  readonly stats = input.required<readonly HeroStat[]>();
  readonly popularSearches = input.required<readonly string[]>();
  readonly vacancies = input.required<readonly PublicVacancy[]>();
  readonly vacanciesState = input.required<LoadState>();

  readonly search = output<JobSearchCriteria>();

  /**
   * El buscador ofrece los mismos catálogos que la página de resultados: áreas
   * profesionales (T15) y estados de México. Antes ofrecía cuatro "categorías"
   * inventadas que la API no conoce, así que el filtro no podía aplicarse.
   */
  protected readonly areas = PROFESSIONAL_AREAS;
  protected readonly states = MX_STATES;

  protected preview(): readonly PublicVacancy[] {
    return this.vacancies().slice(0, PREVIEW_COUNT);
  }

  protected readonly form = new FormGroup({
    query: new FormControl('', { nonNullable: true }),
    area: new FormControl('', { nonNullable: true }),
    state: new FormControl('', { nonNullable: true }),
  });

  protected toneClass(tone: HeroStat['tone']): string {
    return TONE_SOFT[tone];
  }

  protected submit(): void {
    this.search.emit(this.form.getRawValue());
  }

  /** Chip de búsqueda frecuente: rellena el término y lanza la búsqueda. */
  protected searchFor(term: string): void {
    this.form.patchValue({ query: term });
    this.submit();
  }
}
