import type { NextRequest } from "next/server";
import { assertSameOriginRequest } from "@/lib/csrf";
import { clearAuthCookies } from "@/lib/cookies";
import { apiSuccess, createRequestId, handleApiError } from "@/lib/errors";
import { enforceRateLimit, getClientIp } from "@/lib/rate-limit";
import { resetPasswordSchema } from "@/lib/validations/auth";
import { authService } from "@/services/auth/auth.service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  try {
    assertSameOriginRequest(request);
    enforceRateLimit(getClientIp(request), {
      bucket: "auth:reset-password",
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });

    const body: unknown = await request.json();
    const parsed = resetPasswordSchema.parse(body);
    await authService.resetPassword(parsed.token, parsed.newPassword);

    const response = apiSuccess(
      { message: "Password updated. Sign in with your new password." },
      200,
      requestId
    );
    clearAuthCookies(response);
    return response;
  } catch (error) {
    return handleApiError(error, requestId, {
      route: "/api/auth/reset-password",
    });
  }
}
