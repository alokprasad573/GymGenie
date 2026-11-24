import type { NextRequest } from "next/server";
import { apiSuccess, createRequestId, handleApiError } from "@/lib/errors";
import { analyticsRangeSchema } from "@/lib/validations/workout";
import { requireApiAuth } from "@/services/auth/session-guard";
import { analyticsService } from "@/services/analytics/analytics.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestId = createRequestId();
  try {
    const auth = await requireApiAuth(request);
    const daysParam = request.nextUrl.searchParams.get("days") ?? "7";
    const { days } = analyticsRangeSchema.parse({ days: daysParam });
    const data = await analyticsService.getWeekly(auth.userId, days);
    return apiSuccess(data, 200, requestId);
  } catch (error) {
    return handleApiError(error, requestId, {
      route: "GET /api/analytics/weekly",
    });
  }
}
