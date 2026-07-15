import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { AuthenticatedUser } from '@/common/types/authenticated-user';

type CurrentUserReturn =
  AuthenticatedUser | AuthenticatedUser[keyof AuthenticatedUser] | undefined;

/** Extrae el usuario autenticado (o uno de sus campos) del request. */
export const CurrentUser = createParamDecorator(
  (
    data: keyof AuthenticatedUser | undefined,
    ctx: ExecutionContext,
  ): CurrentUserReturn => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user) return undefined;
    return data ? user[data] : user;
  },
);
