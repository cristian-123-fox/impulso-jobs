import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor,
  StreamableFile,
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
  ApiSuccessResponse<T> | T | undefined
> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiSuccessResponse<T> | T | undefined> {
    const response = context.switchToHttp().getResponse<Response>();
    const message =
      this.reflector.get<string | undefined>(
        RESPONSE_MESSAGE_KEY,
        context.getHandler(),
      ) ?? 'Success';

    // Datos de sesión, catálogo y cupos: el navegador no debe reutilizarlos.
    // Sin esto, un 304 con un body viejo dejaba `/plans` o `/payments/options`
    // vacíos en la UI aunque la API sí tuviera datos.
    response.setHeader('Cache-Control', 'no-store');

    return next.handle().pipe(
      map((content: T): ApiSuccessResponse<T> | T | undefined => {
        // Nest detecta StreamableFile en el valor FINAL de la cadena; si se
        // envuelve en el envelope, el stream jamás se envía (descarga de CV).
        if (content instanceof StreamableFile) {
          return content;
        }
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
