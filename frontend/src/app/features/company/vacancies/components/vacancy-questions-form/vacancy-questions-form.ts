import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { IjButton, IjIcon } from '@/shared/ui';
import { piiWarning } from '@/shared/utils/pii';
import {
  SaveVacancyQuestionPayload,
  VacancyQuestion,
  VacancyQuestionType,
} from '@/features/company/vacancies/models/vacancies.models';

interface EditorOption {
  optionText: string;
  weight: number;
}

interface EditorQuestion {
  questionText: string;
  questionType: VacancyQuestionType;
  options: EditorOption[];
}

const MAX_QUESTIONS = 5;
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 5;

const WEIGHT_CHOICES: { value: number; label: string }[] = [
  { value: -1, label: 'Excluyente' },
  ...Array.from({ length: 11 }, (_, i) => ({
    value: i,
    label: `${i} pts`,
  })),
];

const NEW_OPTION = (): EditorOption => ({ optionText: '', weight: 0 });
const NEW_QUESTION = (): EditorQuestion => ({
  questionText: '',
  questionType: 'CLOSED',
  options: [NEW_OPTION(), NEW_OPTION()],
});

/**
 * Editor de preguntas de filtrado (M15): hasta 5 preguntas, cerradas con 2–5
 * opciones ponderadas (-1 excluyente | 0..10 pts) o abiertas. Presentacional:
 * emite el payload y el padre guarda.
 */
@Component({
  selector: 'app-vacancy-questions-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjButton, IjIcon],
  template: `
    @if (error(); as message) {
      <p
        role="alert"
        class="mb-4 rounded-lg bg-red-50 px-3 py-2 text-[13px] font-medium text-red-700"
      >
        {{ message }}
      </p>
    }

    <p class="mb-4 rounded-lg bg-surface px-3 py-2.5 text-[12.5px] text-muted">
      Cada opción suma puntos al aspirante (0–10) o lo descarta si es
      <strong>excluyente</strong>. Las preguntas se congelan al recibir la
      primera postulación.
    </p>

    <div class="space-y-4">
      @for (question of questions(); track $index; let qi = $index) {
        <div class="rounded-2xl border border-line p-4">
          <div class="flex items-start gap-3">
            <span
              class="mt-2 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-[12.5px] font-extrabold text-brand"
            >
              {{ qi + 1 }}
            </span>
            <div class="min-w-0 flex-1">
              <input
                type="text"
                [value]="question.questionText"
                maxlength="200"
                placeholder="Ej: ¿Cuentas con licencia de conducir vigente?"
                class="h-[42px] w-full rounded-xl border border-line bg-white px-3.5 text-[14px] text-ink-900 outline-none focus:border-brand"
                (input)="updateQuestionText(qi, $any($event.target).value)"
              />
              <div class="mt-2 flex flex-wrap items-center gap-2">
                <select
                  class="h-[34px] rounded-lg border border-line bg-white px-2 text-[12.5px] font-semibold text-body outline-none"
                  [value]="question.questionType"
                  (change)="updateQuestionType(qi, $any($event.target).value)"
                >
                  <option value="CLOSED">Cerrada (opciones con peso)</option>
                  <option value="OPEN">Abierta (texto libre)</option>
                </select>
              </div>
            </div>
            <button
              type="button"
              aria-label="Eliminar pregunta"
              class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:bg-red-50 hover:text-red-600"
              (click)="removeQuestion(qi)"
            >
              <ij-icon name="close" [size]="14" />
            </button>
          </div>

          @if (question.questionType === 'CLOSED') {
            <div class="mt-3 space-y-2 pl-10">
              @for (option of question.options; track $index; let oi = $index) {
                <div class="flex items-center gap-2">
                  <input
                    type="text"
                    [value]="option.optionText"
                    maxlength="200"
                    placeholder="Opción de respuesta"
                    class="h-[36px] min-w-0 flex-1 rounded-lg border border-line bg-white px-3 text-[13px] text-ink-900 outline-none focus:border-brand"
                    (input)="updateOptionText(qi, oi, $any($event.target).value)"
                  />
                  <select
                    class="h-[36px] w-[120px] flex-shrink-0 rounded-lg border border-line bg-white px-2 text-[12.5px] font-semibold outline-none"
                    [class.text-red-600]="option.weight === -1"
                    [value]="option.weight"
                    (change)="updateOptionWeight(qi, oi, $any($event.target).value)"
                  >
                    @for (choice of weightChoices; track choice.value) {
                      <option [value]="choice.value">{{ choice.label }}</option>
                    }
                  </select>
                  <button
                    type="button"
                    aria-label="Eliminar opción"
                    class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                    [disabled]="question.options.length <= minOptions"
                    (click)="removeOption(qi, oi)"
                  >
                    <ij-icon name="close" [size]="13" />
                  </button>
                </div>
              }
              @if (question.options.length < maxOptions) {
                <button
                  type="button"
                  class="text-[12.5px] font-bold text-brand hover:underline"
                  (click)="addOption(qi)"
                >
                  + Agregar opción
                </button>
              }
            </div>
          }
        </div>
      } @empty {
        <p class="rounded-2xl bg-surface px-4 py-8 text-center text-[13.5px] text-muted">
          Esta vacante aún no tiene preguntas de filtrado.
        </p>
      }
    </div>

    @if (piiNotice(); as notice) {
      <p class="mt-3 rounded-lg bg-accent-amber-soft px-3 py-2 text-[13px] font-medium text-accent-amber">
        {{ notice }}
      </p>
    }

    @if (questions().length < maxQuestions) {
      <button
        type="button"
        class="mt-4 w-full rounded-xl border border-dashed border-brand/40 py-2.5 text-[13.5px] font-bold text-brand transition-colors hover:bg-brand-50"
        (click)="addQuestion()"
      >
        + Agregar pregunta ({{ questions().length }}/{{ maxQuestions }})
      </button>
    }

    <div class="mt-6 flex justify-end gap-3 border-t border-line pt-4">
      <button
        type="button"
        class="rounded-xl border border-line bg-white px-4 py-2.5 text-[13.5px] font-bold text-body transition-colors hover:bg-surface"
        (click)="cancel.emit()"
      >
        Cancelar
      </button>
      <button
        ij-button
        type="button"
        variant="primary"
        shape="rounded"
        size="md"
        [disabled]="!isValid() || submitting()"
        (click)="onSave()"
      >
        {{ submitting() ? 'Guardando…' : 'Guardar preguntas' }}
      </button>
    </div>
  `,
})
export class VacancyQuestionsForm implements OnInit {
  readonly initial = input<VacancyQuestion[]>([]);
  readonly submitting = input(false);
  readonly error = input<string | null>(null);
  readonly save = output<SaveVacancyQuestionPayload[]>();
  readonly cancel = output<void>();

  protected readonly maxQuestions = MAX_QUESTIONS;
  protected readonly minOptions = MIN_OPTIONS;
  protected readonly maxOptions = MAX_OPTIONS;
  protected readonly weightChoices = WEIGHT_CHOICES;

  protected readonly questions = signal<EditorQuestion[]>([]);

  protected readonly isValid = computed(() =>
    this.questions().every((question) => {
      if (!question.questionText.trim()) return false;
      if (question.questionType === 'OPEN') return true;
      return (
        question.options.length >= MIN_OPTIONS &&
        question.options.length <= MAX_OPTIONS &&
        question.options.every((option) => option.optionText.trim().length > 0)
      );
    }),
  );

  protected readonly piiNotice = computed(() =>
    piiWarning(
      this.questions()
        .map((question) => question.questionText)
        .join('\n'),
    ),
  );

  ngOnInit(): void {
    this.questions.set(
      this.initial().map((question) => ({
        questionText: question.questionText,
        questionType: question.questionType,
        options: question.options.map((option) => ({
          optionText: option.optionText,
          weight: option.weight,
        })),
      })),
    );
  }

  protected addQuestion(): void {
    if (this.questions().length >= MAX_QUESTIONS) return;
    this.questions.update((list) => [...list, NEW_QUESTION()]);
  }

  protected removeQuestion(index: number): void {
    this.questions.update((list) => list.filter((_, i) => i !== index));
  }

  protected updateQuestionText(index: number, value: string): void {
    this.patchQuestion(index, { questionText: value });
  }

  protected updateQuestionType(index: number, value: string): void {
    const questionType = value as VacancyQuestionType;
    this.questions.update((list) =>
      list.map((question, i) =>
        i === index
          ? {
              ...question,
              questionType,
              options:
                questionType === 'CLOSED' && question.options.length === 0
                  ? [NEW_OPTION(), NEW_OPTION()]
                  : question.options,
            }
          : question,
      ),
    );
  }

  protected addOption(questionIndex: number): void {
    this.questions.update((list) =>
      list.map((question, i) =>
        i === questionIndex && question.options.length < MAX_OPTIONS
          ? { ...question, options: [...question.options, NEW_OPTION()] }
          : question,
      ),
    );
  }

  protected removeOption(questionIndex: number, optionIndex: number): void {
    this.questions.update((list) =>
      list.map((question, i) =>
        i === questionIndex && question.options.length > MIN_OPTIONS
          ? {
              ...question,
              options: question.options.filter((_, o) => o !== optionIndex),
            }
          : question,
      ),
    );
  }

  protected updateOptionText(
    questionIndex: number,
    optionIndex: number,
    value: string,
  ): void {
    this.patchOption(questionIndex, optionIndex, { optionText: value });
  }

  protected updateOptionWeight(
    questionIndex: number,
    optionIndex: number,
    value: string,
  ): void {
    this.patchOption(questionIndex, optionIndex, {
      weight: Number.parseInt(value, 10),
    });
  }

  protected onSave(): void {
    if (!this.isValid()) return;
    this.save.emit(
      this.questions().map((question) => ({
        questionText: question.questionText.trim(),
        questionType: question.questionType,
        ...(question.questionType === 'CLOSED' && {
          options: question.options.map((option) => ({
            optionText: option.optionText.trim(),
            weight: option.weight,
          })),
        }),
      })),
    );
  }

  private patchQuestion(index: number, patch: Partial<EditorQuestion>): void {
    this.questions.update((list) =>
      list.map((question, i) =>
        i === index ? { ...question, ...patch } : question,
      ),
    );
  }

  private patchOption(
    questionIndex: number,
    optionIndex: number,
    patch: Partial<EditorOption>,
  ): void {
    this.questions.update((list) =>
      list.map((question, i) =>
        i === questionIndex
          ? {
              ...question,
              options: question.options.map((option, o) =>
                o === optionIndex ? { ...option, ...patch } : option,
              ),
            }
          : question,
      ),
    );
  }
}
