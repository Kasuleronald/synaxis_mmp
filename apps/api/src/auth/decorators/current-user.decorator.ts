import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Request } from "express";
import { SessionUser } from "@life-mmp/shared";

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): SessionUser => {
  const req = ctx.switchToHttp().getRequest<Request & { user: SessionUser }>();
  return req.user;
});
