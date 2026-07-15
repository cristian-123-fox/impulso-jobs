import { HttpException } from '@nestjs/common';
import { ErrorCode } from '@/common/types/error-code.enum';

/**
 * Excepción de dominio con `errorCode` estable. El `AllExceptionsFilter` la
 * traduce al envelope de error `{ success, statusCode, message, errorCode, errors }`.
 */
export class AppException extends HttpException {
  constructor(status: number, errorCode: ErrorCode, message: string) {
    super({ message, errorCode }, status);
  }
}
