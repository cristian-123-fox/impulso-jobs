export enum VacancyQuestionType {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

/** Peso centinela: la respuesta descarta al aspirante (no suma al puntaje). */
export const EXCLUDING_WEIGHT = -1;
export const MIN_ANSWER_WEIGHT = -1;
export const MAX_ANSWER_WEIGHT = 10;

export const MAX_QUESTIONS_PER_VACANCY = 5;
export const MIN_OPTIONS_PER_QUESTION = 2;
export const MAX_OPTIONS_PER_QUESTION = 5;
export const MAX_QUESTION_LENGTH = 200;
export const MAX_OPTION_LENGTH = 200;
export const MAX_OPEN_ANSWER_LENGTH = 1000;
