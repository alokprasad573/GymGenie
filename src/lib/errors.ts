import "server-only";
import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { logger } from "@/lib/logger";

export type ErrorCode =
  | "BAD_REQUEST"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "CSRF_FAILED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "PROVIDER_ERROR"
  | "SERVICE_UNAVAILABLE"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, string[]>;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number,
    details?: Record<string, string[]>
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export interface ApiErrorEnvelope {
  error: {
    code: ErrorCode;
    message: string;
    requestId: string;
    details?: Record<string, string[]>;
  };
}

export interface ApiSuccessEnvelope<T> {
  data: T;
  requestId: string;
}

export function createRequestId(): string {
  return crypto.randomUUID();
}

export function apiSuccess<T>(
  data: T,
  status = 200,
  requestId = createRequestId()
): NextResponse<ApiSuccessEnvelope<T>> {
  return NextResponse.json(
    { data, requestId },
    {
      status,
      headers: { "X-Request-Id": requestId },
    }
  );
}

function isMongoDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === 11000
  );
}

function isMongooseCastError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "name" in err &&
    (err as { name?: unknown }).name === "CastError"
  );
}

export function handleApiError(
  err: unknown,
  requestId = createRequestId(),
  context?: Record<string, unknown>
): NextResponse<ApiErrorEnvelope> {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error("Application error", {
        requestId,
        code: err.code,
        message: err.message,
        ...context,
      });
    } else {
      logger.warn("Client request error", {
        requestId,
        code: err.code,
        statusCode: err.statusCode,
        ...context,
      });
    }
    return NextResponse.json(
      {
        error: {
          code: err.code,
          message: err.message,
          requestId,
          ...(err.details ? { details: err.details } : {}),
        },
      },
      { status: err.statusCode, headers: { "X-Request-Id": requestId } }
    );
  }

  if (err instanceof ZodError) {
    const details: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const key = issue.path.join(".") || "body";
      const existing = details[key] ?? [];
      existing.push(issue.message);
      details[key] = existing;
    }
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          requestId,
          details,
        },
      },
      { status: 400, headers: { "X-Request-Id": requestId } }
    );
  }

  if (isMongoDuplicateKeyError(err)) {
    logger.warn("Database duplicate key conflict", { requestId, ...context });
    return NextResponse.json(
      {
        error: {
          code: "CONFLICT",
          message: "A record with this unique value already exists",
          requestId,
        },
      },
      { status: 409, headers: { "X-Request-Id": requestId } }
    );
  }

  if (isMongooseCastError(err)) {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "Invalid resource identifier",
          requestId,
        },
      },
      { status: 400, headers: { "X-Request-Id": requestId } }
    );
  }

  logger.error("Unhandled server error", {
    requestId,
    error: err instanceof Error ? { name: err.name, message: err.message } : "Unknown",
    ...context,
  });

  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected server error occurred",
        requestId,
      },
    },
    { status: 500, headers: { "X-Request-Id": requestId } }
  );
}
