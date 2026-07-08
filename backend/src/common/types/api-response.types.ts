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
  errors: ApiErrorDetail[];
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
