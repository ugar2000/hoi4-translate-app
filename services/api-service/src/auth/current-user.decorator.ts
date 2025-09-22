import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestWithUser } from './request-with-user.interface';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user;
  },
);
