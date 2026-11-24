import type { NextRequest } from "next/server";
import { assertSameOriginRequest } from "@/lib/csrf";
import { apiSuccess, createRequestId, handleApiError } from "@/lib/errors";
import {
  createWorkoutSchema,
  listWorkoutsQuerySchema,
} from "@/lib/validations/workout";
import { requireApiAuth } from "@/services/auth/session-guard";
import { workoutService } from "@/services/workout/workout.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestId = createRequestId();
  try {
    const auth = await requireApiAuth(request);
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const query = listWorkoutsQuerySchema.parse(params);
    const pageData = await workoutService.listWorkouts(auth.userId, query);
    return apiSuccess(pageData, 200, requestId);
  } catch (error) {
    return handleApiError(error, requestId, { route: "GET /api/workouts" });
  }
}

export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  try {
    assertSameOriginRequest(request);
    const auth = await requireApiAuth(request);
    const body: unknown = await request.json();
    const parsed = createWorkoutSchema.parse(body);

    const { workout, created } = await workoutService.saveWorkout(
      auth.userId,
      parsed
    );
    return apiSuccess({ workout, created }, created ? 201 : 200, requestId);
  } catch (error) {
    return handleApiError(error, requestId, { route: "POST /api/workouts" });
  }
}
