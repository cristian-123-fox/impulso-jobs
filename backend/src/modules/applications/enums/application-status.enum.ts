/**
 * Códigos del catálogo `application_status`. La tabla es la fuente de verdad
 * (un administrador puede añadir estados), pero éstos son los que siembra la
 * plataforma y los únicos a los que la lógica de negocio se refiere por nombre.
 */
export enum ApplicationStatusCode {
  IN_REVIEW = 'IN_REVIEW',
  IN_PROGRESS = 'IN_PROGRESS',
  INTERVIEW = 'INTERVIEW',
  TECHNICAL_TEST = 'TECHNICAL_TEST',
  SELECTED = 'SELECTED',
  REJECTED = 'REJECTED',
  FINISHED = 'FINISHED',
}

/** Estado con el que nace toda postulación. */
export const INITIAL_APPLICATION_STATUS = ApplicationStatusCode.IN_REVIEW;
