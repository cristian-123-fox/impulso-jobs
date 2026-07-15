import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';
import { RESPONSE_MESSAGE_KEY } from '@/common/decorators/response-message.decorator';
import { ApiSuccessResponse } from '@/common/types/api-response.types';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiSuccessResponse<T> | undefined
> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiSuccessResponse<T> | undefined> {
    const response = context.switchToHttp().getResponse<Response>();
    const message =
      this.reflector.get<string | undefined>(
        RESPONSE_MESSAGE_KEY,
        context.getHandler(),
      ) ?? 'Success';

    return next.handle().pipe(
      map((content: T): ApiSuccessResponse<T> | undefined => {
        const noContent: number = HttpStatus.NO_CONTENT;
        if (response.statusCode === noContent) {
          return undefined;
        }
        return {
          success: true,
          statusCode: response.statusCode,
          message,
          content,
        };
      }),
    );
  }
}
