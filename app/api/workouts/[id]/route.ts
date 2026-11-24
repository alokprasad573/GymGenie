import type { NextRequest } from "next/server";
import { assertSameOriginRequest } from "@/lib/csrf";
import { apiSuccess, createRequestId, handleApiError } from "@/lib/errors";
import { updateWorkoutSchema } from "@/lib/validations/workout";
import { requireApiAuth } from "@/services/auth/session-guard";
import { workoutService } from "@/services/workout/workout.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const requestId = createRequestId();
  try {
    const auth = await requireApiAuth(request);
    const { id } = await params;
    const workout = await workoutService.getWorkout(auth.userId, id);
    return apiSuccess({ workout }, 200, requestId);
  } catch (error) {
    return handleApiError(error, requestId, { route: "GET /api/workouts/[id]" });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const requestId = createRequestId();
  try {
    assertSameOriginRequest(request);
    const auth = await requireApiAuth(request);
    const { id } = await params;
    const body: unknown = await request.json();
    const parsed = updateWorkoutSchema.parse(body);
    const workout = await workoutService.updateWorkout(auth.userId, id, parsed);
    return apiSuccess({ workout }, 200, requestId);
  } catch (error) {
    return handleApiError(error, requestId, {
      route: "PATCH /api/workouts/[id]",
    });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const requestId = createRequestId();
  try {
    assertSameOriginRequest(request);
    const auth = await requireApiAuth(request);
    const { id } = await params;
    await workoutService.deleteWorkout(auth.userId, id);
    return apiSuccess({ deleted: true }, 200, requestId);
  } catch (error) {
    return handleApiError(error, requestId, {
      route: "DELETE /api/workouts/[id]",
    });
  }
}
