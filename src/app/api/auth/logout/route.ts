import type { NextRequest } from "next/server";
import { assertSameOriginRequest } from "@/lib/csrf";
import { clearAuthCookies, REFRESH_COOKIE_NAME } from "@/lib/cookies";
import { apiSuccess, createRequestId, handleApiError } from "@/lib/errors";
import { authService } from "@/services/auth/auth.service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  try {
    assertSameOriginRequest(request);
    const rawRefresh = request.cookies.get(REFRESH_COOKIE_NAME)?.value;
    await authService.logout(rawRefresh);

    const response = apiSuccess({ loggedOut: true }, 200, requestId);
    clearAuthCookies(response);
    return response;
  } catch (error) {
    return handleApiError(error, requestId, { route: "/api/auth/logout" });
  }
}
