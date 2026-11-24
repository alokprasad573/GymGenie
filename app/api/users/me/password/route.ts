import type { NextRequest } from "next/server";
import { assertSameOriginRequest } from "@/lib/csrf";
import { setAuthCookies } from "@/lib/cookies";
import { apiSuccess, createRequestId, handleApiError } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/rate-limit";
import { changePasswordSchema } from "@/lib/validations/auth";
import { authService } from "@/services/auth/auth.service";
import { requireApiAuth } from "@/services/auth/session-guard";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest) {
  const requestId = createRequestId();
  try {
    assertSameOriginRequest(request);
    const auth = await requireApiAuth(request);
    enforceRateLimit(auth.userId, {
      bucket: "users:change-password",
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });

    const body: unknown = await request.json();
    const parsed = changePasswordSchema.parse(body);
    const { user, tokens } = await authService.changePassword(
      auth.userId,
      parsed
    );

    const response = apiSuccess(
      { user, message: "Password updated and other sessions revoked." },
      200,
      requestId
    );
    setAuthCookies(response, tokens);
    return response;
  } catch (error) {
    return handleApiError(error, requestId, {
      route: "PATCH /api/users/me/password",
    });
  }
}
