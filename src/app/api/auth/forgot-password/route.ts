import type { NextRequest } from "next/server";
import { assertSameOriginRequest } from "@/lib/csrf";
import { apiSuccess, createRequestId, handleApiError } from "@/lib/errors";
import { enforceRateLimit, getClientIp } from "@/lib/rate-limit";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { authService } from "@/services/auth/auth.service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  try {
    assertSameOriginRequest(request);
    enforceRateLimit(getClientIp(request), {
      bucket: "auth:forgot-password",
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });

    const body: unknown = await request.json();
    const parsed = forgotPasswordSchema.parse(body);
    await authService.requestPasswordReset(parsed.email);

    // Always return identical generic message to prevent email enumeration
    return apiSuccess(
      {
        message:
          "If an account exists for that email, password reset instructions have been issued.",
      },
      200,
      requestId
    );
  } catch (error) {
    return handleApiError(error, requestId, {
      route: "/api/auth/forgot-password",
    });
  }
}
