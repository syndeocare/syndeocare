import {
  BadRequestException,
  createParamDecorator,
  type ExecutionContext,
} from "@nestjs/common";

export const DEV_ACTOR_SUBJECT_HEADER = "x-actor-subject";

export const CurrentSubject = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ headers?: Record<string, unknown> }>();
    const headerValue = request.headers?.[DEV_ACTOR_SUBJECT_HEADER];

    if (typeof headerValue === "string" && headerValue.trim().length > 0) {
      return headerValue;
    }

    if (Array.isArray(headerValue) && typeof headerValue[0] === "string") {
      return headerValue[0];
    }

    throw new BadRequestException(
      `The ${DEV_ACTOR_SUBJECT_HEADER} header is required for this route.`,
    );
  },
);
