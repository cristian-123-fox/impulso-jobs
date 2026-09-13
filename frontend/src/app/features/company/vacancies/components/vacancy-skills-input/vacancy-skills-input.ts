import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { IjIcon } from '@/shared/ui';
import { IJ_HINT, IJ_LABEL } from '@/shared/ui/forms/control-styles';
import { VacanciesApi } from '@/features/company/vacancies/data/vacancies.api';
import {
  MAX_VACANCY_SKILLS,
  SaveVacancySkill,
  SkillSuggestion,
} from '@/features/company/vacancies/models/vacancies.models';

/**
 * Skills de la vacante (T32, fase 1 — cierra el frontend que T25 dejó
 * pendiente).
 *
 * No usa `ij-autocomplete` porque el caso no es "elegir una de la lista": el
 * catálogo se **puebla escribiendo**. El backend crea o reutiliza la skill por
 * nombre al guardar, así que aquí una sugerencia y un nombre nuevo valen igual;
 * la sugerencia sólo evita duplicados por tilde o mayúscula.
 *
 * Cada skill puede marcarse como **obligatoria** o deseable, que es lo que
 * `isRequired` significa en `vacancy_skills` y lo que el portal distingue.
 */
@Component({
  selector: 'app-vacancy-skills-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, IjIcon],
  template: `
    <label [class]="labelClass">
      {{ label() }}
      <span class="ml-1 font-normal text-muted">
        ({{ skills().length }}/{{ max }})
      </span>
    </label>

    <div [class]="boxClass()">
      @for (skill of skills(); track skill.name) {
        <span
          class="flex items-center gap-1.5 rounded-full py-1 pl-3 pr-1.5 text-[13px] font-semibold"
          [class]="
            skill.isRequired
              ? 'bg-brand-50 text-brand-strong'
              : 'bg-surface text-body'
          "
        >
          {{ skill.name }}
          <button
            type="button"
            class="rounded px-1 text-[11px] font-bold uppercase tracking-wide opacity-70 transition-opacity hover:opacity-100"
            [title]="
              skill.isRequired
                ? 'Marcar como deseable'
                : 'Marcar como obligatoria'
            "
            (click)="toggleRequired(skill)"
          >
            {{ skill.isRequired ? 'Obligatoria' : 'Deseable' }}
          </button>
          <button
            type="button"
            class="flex h-5 w-5 items-center justify-center rounded-full transition-colors hover:bg-black/10"
            [attr.aria-label]="'Quitar ' + skill.name"
            (click)="remove(skill)"
          >
            <ij-icon name="x" [size]="12" />
          </button>
        </span>
      }

      @if (skills().length < max) {
        <input
          type="text"
          class="min-w-[160px] flex-1 border-0 bg-transparent p-0 text-[14px] leading-5 text-ink-900 placeholder:text-muted focus:outline-none focus:ring-0"
          [placeholder]="
            skills().length === 0 ? 'Angular, Excel, atención a clientes…' : ''
          "
          [formControl]="query"
          (keydown)="onKeydown($event)"
          (focus)="focused.set(true)"
          (blur)="onBlur()"
        />
      }
    </div>

    @if (suggestions().length > 0 && focused()) {
      <div
        class="mt-1 overflow-hidden rounded-xl border border-line bg-white shadow-card"
      >
        @for (item of suggestions(); track item.id) {
          <button
            type="button"
            class="block w-full px-3.5 py-2 text-left text-[13.5px] text-body transition-colors hover:bg-surface"
            (mousedown)="$event.preventDefault(); addSuggestion(item)"
          >
            {{ item.name }}
          </button>
        }
      </div>
    }

    @if (notice(); as message) {
      <p class="mt-1 text-[12px] font-medium text-amber-700">{{ message }}</p>
    } @else {
      <p [class]="hintClass">
        Escribe y pulsa Enter para añadir. Pulsa la etiqueta para cambiar entre
        obligatoria y deseable.
      </p>
    }
  `,
})
export class VacancySkillsInput {
  readonly label = input('Habilidades requeridas');
  /** Lista editada. `model()` para que el wizard la lea y la reescriba. */
  readonly skills = model<SaveVacancySkill[]>([]);

  private readonly api = inject(VacanciesApi);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly max = MAX_VACANCY_SKILLS;
  protected readonly labelClass = IJ_LABEL;
  protected readonly hintClass = IJ_HINT;
  protected readonly query = new FormControl('', { nonNullable: true });
  protected readonly focused = signal(false);
  protected readonly notice = signal<string | null>(null);
  protected readonly suggestions = signal<readonly SkillSuggestion[]>([]);

  protected readonly boxClass = computed(() => {
    const base =
      'flex min-h-[42px] w-full flex-wrap items-center gap-2 rounded-xl border bg-white px-3 py-2 transition-colors';
    return this.focused()
      ? `${base} border-brand ring-2 ring-brand/15`
      : `${base} border-line hover:border-brand/50`;
  });

  constructor() {
    this.query.valueChanges
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((value) => {
          const term = value.trim();
          // Con menos de dos letras el backend devolvería medio catálogo.
          if (term.length < 2) return of([] as SkillSuggestion[]);
          return this.api.searchSkills(term);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (items) => this.suggestions.set(this.notAlreadyAdded(items)),
        // El autocomplete es una ayuda: si falla, se escribe el nombre y ya.
        error: () => this.suggestions.set([]),
      });
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.addTyped();
      return;
    }
    // Retroceso con el campo vacío borra la última, como en cualquier chips.
    if (event.key === 'Backspace' && this.query.value === '') {
      const current = this.skills();
      if (current.length > 0) this.remove(current[current.length - 1]);
    }
  }

  protected onBlur(): void {
    // Se añade lo tecleado al salir: perder una skill a medio escribir por
    // cambiar de paso en el wizard sería lo más molesto del formulario.
    this.addTyped();
    this.focused.set(false);
  }

  protected addSuggestion(item: SkillSuggestion): void {
    this.push({ skillId: item.id, name: item.name, isRequired: true });
    this.query.setValue('');
    this.suggestions.set([]);
  }

  protected toggleRequired(skill: SaveVacancySkill): void {
    this.skills.update((list) =>
      list.map((item) =>
        item.name === skill.name
          ? { ...item, isRequired: !item.isRequired }
          : item,
      ),
    );
  }

  protected remove(skill: SaveVacancySkill): void {
    this.skills.update((list) =>
      list.filter((item) => item.name !== skill.name),
    );
    this.notice.set(null);
  }

  private addTyped(): void {
    const name = this.query.value.trim();
    if (name === '') return;
    this.push({ name, isRequired: true });
    this.query.setValue('');
    this.suggestions.set([]);
  }

  private push(skill: SaveVacancySkill): void {
    const current = this.skills();
    if (current.length >= this.max) {
      this.notice.set(`Máximo ${this.max} habilidades por vacante.`);
      return;
    }
    if (current.some((item) => sameName(item.name, skill.name))) {
      this.notice.set(`"${skill.name}" ya está en la lista.`);
      return;
    }
    this.notice.set(null);
    this.skills.update((list) => [
      ...list,
      { ...skill, sortOrder: list.length },
    ]);
  }

  private notAlreadyAdded(
    items: readonly SkillSuggestion[],
  ): readonly SkillSuggestion[] {
    const current = this.skills();
    return items.filter(
      (item) => !current.some((added) => sameName(added.name, item.name)),
    );
  }
}

/**
 * Compara ignorando mayúsculas y acentos, que es el mismo criterio con el que
 * el backend genera el `slug` único de la skill: sin esto, "Diseño" y "diseno"
 * se añadirían como dos etiquetas y el backend las uniría en una al guardar.
 *
 * Se usa `Intl.Collator` en vez de quitar diacríticos a mano: hace el trabajo
 * bien para el español y no obliga a meter rangos Unicode en el código.
 */
const COLLATOR = new Intl.Collator('es', { sensitivity: 'base' });

function sameName(a: string, b: string): boolean {
  return COLLATOR.compare(a.trim(), b.trim()) === 0;
}
