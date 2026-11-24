import type { NextRequest } from "next/server";
import { apiSuccess, createRequestId, handleApiError } from "@/lib/errors";
import { requireApiAuth } from "@/services/auth/session-guard";
import { analyticsService } from "@/services/analytics/analytics.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestId = createRequestId();
  try {
    const auth = await requireApiAuth(request);
    const overview = await analyticsService.getOverview(auth.userId);
    return apiSuccess(overview, 200, requestId);
  } catch (error) {
    return handleApiError(error, requestId, {
      route: "GET /api/analytics/overview",
    });
  }
}
