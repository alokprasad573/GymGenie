import type { NextRequest } from "next/server";
import { assertSameOriginRequest } from "@/lib/csrf";
import { apiSuccess, createRequestId, handleApiError } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/rate-limit";
import { coachingRequestSchema } from "@/lib/validations/coaching";
import { requireApiAuth } from "@/services/auth/session-guard";
import { coachingService } from "@/services/coaching/groq-coaching.service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  try {
    assertSameOriginRequest(request);
    const auth = await requireApiAuth(request);

    enforceRateLimit(auth.userId, {
      bucket: "ai:coaching",
      limit: 30,
      windowMs: 60 * 1000,
    });

    const body: unknown = await request.json();
    const parsed = coachingRequestSchema.parse(body);

    const result = await coachingService.generateFeedback(auth.userId, parsed);
    return apiSuccess(result, 200, requestId);
  } catch (error) {
    return handleApiError(error, requestId, { route: "POST /api/ai/coaching" });
  }
}
