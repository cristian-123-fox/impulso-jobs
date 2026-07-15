import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  ApiErrorDetail,
  ApiErrorResponse,
} from '@/common/types/api-response.types';
import { ErrorCode } from '@/common/types/error-code.enum';

interface HttpExceptionResponseShape {
  message?: string | string[];
  error?: string;
  errors?: unknown;
  errorCode?: string;
}

interface NormalizedError {
  statusCode: number;
  message: string;
  errorCode?: string;
  errors: ApiErrorDetail[];
  exceptionName: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isHttpExceptionResponseObject(
  value: unknown,
): value is HttpExceptionResponseShape {
  return isRecord(value);
}

function toErrorDetail(item: unknown, defaultCode?: string): ApiErrorDetail {
  if (typeof item === 'string') {
    return { message: item, ...(defaultCode && { code: defaultCode }) };
  }
  if (isRecord(item)) {
    const message =
      typeof item.message === 'string' ? item.message : JSON.stringify(item);
    const field = typeof item.field === 'string' ? item.field : undefined;
    const code = typeof item.code === 'string' ? item.code : defaultCode;
    return {
      message,
      ...(field && { field }),
      ...(code && { code }),
    };
  }
  return {
    message: String(item),
    ...(defaultCode && { code: defaultCode }),
  };
}

function normalizeErrors(
  value: unknown,
  defaultCode?: string,
): ApiErrorDetail[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => toErrorDetail(item, defaultCode));
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const normalized = this.normalize(exception);

    this.audit(request, normalized, exception);

    const body: ApiErrorResponse = {
      success: false,
      statusCode: normalized.statusCode,
      message: normalized.message,
      ...(normalized.errorCode && { errorCode: normalized.errorCode }),
      errors: normalized.errors,
    };

    response.status(normalized.statusCode).json(body);
  }

  private audit(
    request: Request,
    normalized: NormalizedError,
    exception: unknown,
  ): void {
    const userAgent = request.get('user-agent') ?? '-';
    const ip = request.ip ?? '-';
    const summary = `${request.method} ${request.url} ip=${ip} ua="${userAgent}" -> ${normalized.statusCode} [${normalized.exceptionName}] ${normalized.message}`;
    const stack = exception instanceof Error ? exception.stack : undefined;
    const serverError: number = HttpStatus.INTERNAL_SERVER_ERROR;
    const clientError: number = HttpStatus.BAD_REQUEST;

    if (normalized.statusCode >= serverError) {
      this.logger.error(summary, stack);
    } else if (normalized.statusCode >= clientError) {
      this.logger.warn(summary);
    } else {
      this.logger.log(summary);
    }
  }

  private normalize(exception: unknown): NormalizedError {
    if (exception instanceof HttpException) {
      return this.normalizeHttpException(exception);
    }

    if (exception instanceof Error) {
      const exceptionName = exception.constructor.name;
      const message = exception.message || 'Internal server error';
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message,
        errorCode: ErrorCode.INTERNAL_ERROR,
        errors: [{ message, code: exceptionName }],
        exceptionName,
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      errorCode: ErrorCode.INTERNAL_ERROR,
      errors: [{ message: String(exception), code: 'UnknownException' }],
      exceptionName: 'UnknownException',
    };
  }

  private normalizeHttpException(exception: HttpException): NormalizedError {
    const statusCode = exception.getStatus();
    const exceptionName = exception.constructor.name;
    const res = exception.getResponse();

    if (typeof res === 'string') {
      return {
        statusCode,
        message: res,
        errors: [{ message: res, code: exceptionName }],
        exceptionName,
      };
    }

    if (!isHttpExceptionResponseObject(res)) {
      return {
        statusCode,
        message: exception.message,
        errors: [{ message: exception.message, code: exceptionName }],
        exceptionName,
      };
    }

    if (Array.isArray(res.message)) {
      return {
        statusCode,
        message: res.error ?? 'Validation failed',
        errorCode: ErrorCode.VALIDATION_ERROR,
        errors: normalizeErrors(res.message, ErrorCode.VALIDATION_ERROR),
        exceptionName,
      };
    }

    const topMessage = res.message ?? exception.message;
    const errorCode = res.errorCode;
    const detailCode = errorCode ?? exceptionName;
    const customErrors = normalizeErrors(res.errors, detailCode);
    return {
      statusCode,
      message: topMessage,
      ...(errorCode && { errorCode }),
      errors:
        customErrors.length > 0
          ? customErrors
          : [{ message: topMessage, code: detailCode }],
      exceptionName,
    };
  }
}
