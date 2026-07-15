/** Envelope de la API. Mientras no exista `@impulso/api-contract`, se tipa a mano. */
export interface ApiSuccessResponse<T> {
  success: true;
  statusCode: number;
  message: string;
  content: T;
}

export interface ApiErrorDetail {
  message: string;
  field?: string;
  code?: string;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  errorCode?: string;
  errors: ApiErrorDetail[];
}
