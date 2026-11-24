import type { NextRequest } from "next/server";
import { assertSameOriginRequest } from "@/lib/csrf";
import { apiSuccess, createRequestId, handleApiError } from "@/lib/errors";
import { updateProfileSchema } from "@/lib/validations/auth";
import { authService } from "@/services/auth/auth.service";
import { requireApiAuth } from "@/services/auth/session-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestId = createRequestId();
  try {
    const auth = await requireApiAuth(request);
    const user = await authService.getProfile(auth.userId);
    return apiSuccess({ user }, 200, requestId);
  } catch (error) {
    return handleApiError(error, requestId, { route: "GET /api/users/me" });
  }
}

export async function PATCH(request: NextRequest) {
  const requestId = createRequestId();
  try {
    assertSameOriginRequest(request);
    const auth = await requireApiAuth(request);
    const body: unknown = await request.json();
    const parsed = updateProfileSchema.parse(body);
    const user = await authService.updateProfile(auth.userId, parsed);
    return apiSuccess({ user }, 200, requestId);
  } catch (error) {
    return handleApiError(error, requestId, { route: "PATCH /api/users/me" });
  }
}
