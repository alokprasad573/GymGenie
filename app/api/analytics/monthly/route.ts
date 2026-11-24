import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, createRequestId, handleApiError } from "@/lib/errors";
import { requireApiAuth } from "@/services/auth/session-guard";
import { analyticsService } from "@/services/analytics/analytics.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const monthlyQuerySchema = z.object({
  months: z.coerce.number().int().min(1).max(12).default(6),
});

export async function GET(request: NextRequest) {
  const requestId = createRequestId();
  try {
    const auth = await requireApiAuth(request);
    const monthsParam = request.nextUrl.searchParams.get("months") ?? "6";
    const { months } = monthlyQuerySchema.parse({ months: monthsParam });
    const data = await analyticsService.getMonthly(auth.userId, months);
    return apiSuccess(data, 200, requestId);
  } catch (error) {
    return handleApiError(error, requestId, {
      route: "GET /api/analytics/monthly",
    });
  }
}
