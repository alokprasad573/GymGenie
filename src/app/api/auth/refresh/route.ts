import type { NextRequest } from "next/server";
import { assertSameOriginRequest } from "@/lib/csrf";
import {
  clearAuthCookies,
  REFRESH_COOKIE_NAME,
  setAuthCookies,
} from "@/lib/cookies";
import { apiSuccess, createRequestId, handleApiError } from "@/lib/errors";
import { enforceRateLimit, getClientIp } from "@/lib/rate-limit";
import { authService } from "@/services/auth/auth.service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  try {
    assertSameOriginRequest(request);
    enforceRateLimit(getClientIp(request), {
      bucket: "auth:refresh",
      limit: 30,
      windowMs: 15 * 60 * 1000,
    });

    const rawRefresh = request.cookies.get(REFRESH_COOKIE_NAME)?.value ?? "";
    const { user, tokens } = await authService.refresh(rawRefresh);

    const response = apiSuccess({ user }, 200, requestId);
    setAuthCookies(response, tokens);
    return response;
  } catch (error) {
    const errorResponse = handleApiError(error, requestId, {
      route: "/api/auth/refresh",
    });
    if (errorResponse.status === 401) {
      clearAuthCookies(errorResponse);
    }
    return errorResponse;
  }
}
