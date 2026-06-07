import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { CORRELATION_ID_HEADER } from "@repo/service-core";

function extractMessage(responseBody: unknown, fallbackMessage: string) {
  if (typeof responseBody === "string" && responseBody.length > 0) {
    return responseBody;
  }

  if (
    typeof responseBody === "object" &&
    responseBody !== null &&
    "message" in responseBody
  ) {
    const message = (responseBody as { message?: unknown }).message;

    if (Array.isArray(message)) {
      return message.join(", ");
    }

    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }

  return fallbackMessage;
}

function buildErrorCode(statusCode: number) {
  if (statusCode >= 500) {
    return "INTERNAL_SERVER_ERROR";
  }

  if (statusCode === HttpStatus.NOT_FOUND) {
    return "NOT_FOUND";
  }

  if (statusCode === HttpStatus.UNAUTHORIZED) {
    return "UNAUTHORIZED";
  }

  if (statusCode === HttpStatus.FORBIDDEN) {
    return "FORBIDDEN";
  }

  if (statusCode === HttpStatus.BAD_REQUEST) {
    return "BAD_REQUEST";
  }

  return "REQUEST_FAILED";
}

@Catch()
export class PlatformApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const reply = context.getResponse<FastifyReply>();
    const request = context.getRequest<FastifyRequest>();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const responseBody =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const correlationId =
      request.headers[CORRELATION_ID_HEADER] ??
      reply.getHeader(CORRELATION_ID_HEADER) ??
      request.id;

    reply.status(statusCode).send({
      code: buildErrorCode(statusCode),
      message: extractMessage(
        responseBody,
        statusCode >= 500
          ? "An unexpected error occurred."
          : "The request could not be completed.",
      ),
      correlationId,
    });
  }
}
