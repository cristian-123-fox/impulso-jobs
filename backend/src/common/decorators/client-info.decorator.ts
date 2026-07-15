import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/** IP y user-agent del cliente, para auditoría y registro de último acceso. */
export interface ClientInfoPayload {
  ip: string;
  userAgent: string;
}

/** Extrae `{ ip, userAgent }` del request. */
export const ClientInfo = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ClientInfoPayload => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return {
      ip: request.ip ?? '-',
      userAgent: request.get('user-agent') ?? '-',
    };
  },
);
