export interface ApiErrorDetail {
  message: string;
  field?: string;
  code?: string;
}

export interface ApiSuccessResponse<T> {
  success: true;
  statusCode: number;
  message: string;
  content: T;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  /** Código de error estable del contrato (ver `ErrorCode`). */
  errorCode?: string;
  errors: ApiErrorDetail[];
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
