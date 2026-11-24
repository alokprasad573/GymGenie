import type {
  ExerciseFrameResult,
  WorkoutConfig,
  WorkoutLifecycleState,
  WorkoutSetRecord,
  WorkoutStatus,
} from "@/types/exercise";
import type { CreateWorkoutInput } from "@/lib/validations/workout";

export interface WorkoutSessionState {
  lifecycle: WorkoutLifecycleState;
  config: WorkoutConfig;
  idempotencyKey: string;
  currentSet: number;
  currentSetReps: number;
  totalReps: number;
  completedSets: WorkoutSetRecord[];
  restSecondsRemaining: number;
  activeDurationMs: number;
  activeSegmentStartedAtMs: number | null;
  currentSetStartedAtMs: number | null;
  startedAtIso: string | null;
  completedAtIso: string | null;
  completionStatus: WorkoutStatus | null;
  lastMetrics: Record<string, number | boolean | string>;
  lastFormIssues: string[];
  lastPhase: ExerciseFrameResult["phase"];
  poseDetected: boolean;
  errorMessage: string | null;
}

export type WorkoutSessionAction =
  | { type: "INIT_START" }
  | { type: "INIT_READY" }
  | { type: "INIT_ERROR"; message: string }
  | { type: "BEGIN_WORKOUT"; nowMs: number; nowIso: string }
  | { type: "PAUSE"; nowMs: number }
  | { type: "RESUME"; nowMs: number }
  | { type: "FRAME_PROCESSED"; result: ExerciseFrameResult; nowMs: number; nowIso: string }
  | { type: "NO_POSE" }
  | { type: "TICK_REST"; nowMs: number }
  | { type: "START_NEXT_SET"; nowMs: number }
  | { type: "END_EARLY"; nowMs: number; nowIso: string }
  | { type: "RESET"; config?: WorkoutConfig; idempotencyKey: string };

export function createInitialWorkoutState(
  config: WorkoutConfig,
  idempotencyKey: string
): WorkoutSessionState {
  return {
    lifecycle: "IDLE",
    config,
    idempotencyKey,
    currentSet: 1,
    currentSetReps: 0,
    totalReps: 0,
    completedSets: [],
    restSecondsRemaining: 0,
    activeDurationMs: 0,
    activeSegmentStartedAtMs: null,
    currentSetStartedAtMs: null,
    startedAtIso: null,
    completedAtIso: null,
    completionStatus: null,
    lastMetrics: {},
    lastFormIssues: [],
    lastPhase: "unknown",
    poseDetected: false,
    errorMessage: null,
  };
}

export function getElapsedActiveSeconds(
  state: WorkoutSessionState,
  nowMs: number
): number {
  const runningDelta =
    state.lifecycle === "ACTIVE" && state.activeSegmentStartedAtMs !== null
      ? Math.max(0, nowMs - state.activeSegmentStartedAtMs)
      : 0;
  return Math.floor((state.activeDurationMs + runningDelta) / 1000);
}

export function workoutSessionReducer(
  state: WorkoutSessionState,
  action: WorkoutSessionAction
): WorkoutSessionState {
  switch (action.type) {
    case "INIT_START":
      return {
        ...state,
        lifecycle: "INITIALIZING",
        errorMessage: null,
      };

    case "INIT_READY":
      if (state.lifecycle !== "INITIALIZING" && state.lifecycle !== "ERROR") {
        return state;
      }
      return {
        ...state,
        lifecycle: "READY",
        errorMessage: null,
      };

    case "INIT_ERROR":
      return {
        ...state,
        lifecycle: "ERROR",
        errorMessage: action.message,
      };

    case "BEGIN_WORKOUT":
      if (state.lifecycle !== "READY" && state.lifecycle !== "IDLE") {
        return state;
      }
      return {
        ...state,
        lifecycle: "ACTIVE",
        startedAtIso: state.startedAtIso ?? action.nowIso,
        activeSegmentStartedAtMs: action.nowMs,
        currentSetStartedAtMs: action.nowMs,
        errorMessage: null,
      };

    case "PAUSE": {
      if (state.lifecycle !== "ACTIVE") return state;
      const delta =
        state.activeSegmentStartedAtMs !== null
          ? Math.max(0, action.nowMs - state.activeSegmentStartedAtMs)
          : 0;
      return {
        ...state,
        lifecycle: "PAUSED",
        activeDurationMs: state.activeDurationMs + delta,
        activeSegmentStartedAtMs: null,
      };
    }

    case "RESUME":
      if (state.lifecycle !== "PAUSED") return state;
      return {
        ...state,
        lifecycle: "ACTIVE",
        activeSegmentStartedAtMs: action.nowMs,
      };

    case "NO_POSE":
      return {
        ...state,
        poseDetected: false,
      };

    case "FRAME_PROCESSED": {
      if (state.lifecycle !== "ACTIVE") {
        return {
          ...state,
          poseDetected: action.result.landmarksValid,
          lastMetrics: action.result.metrics,
          lastPhase: action.result.phase,
        };
      }

      const nextSetReps = action.result.repCompleted
        ? state.currentSetReps + 1
        : state.currentSetReps;
      const nextTotalReps = action.result.repCompleted
        ? state.totalReps + 1
        : state.totalReps;

      // Did this rep complete the current set?
      if (
        action.result.repCompleted &&
        nextSetReps >= state.config.targetReps
      ) {
        const delta =
          state.activeSegmentStartedAtMs !== null
            ? Math.max(0, action.nowMs - state.activeSegmentStartedAtMs)
            : 0;
        const setDurationSeconds =
          state.currentSetStartedAtMs !== null
            ? Math.max(
                1,
                Math.round((action.nowMs - state.currentSetStartedAtMs) / 1000)
              )
            : undefined;

        const completedSet: WorkoutSetRecord = {
          setNumber: state.currentSet,
          reps: nextSetReps,
          ...(setDurationSeconds !== undefined ? { durationSeconds: setDurationSeconds } : {}),
          completedAt: action.nowIso,
        };
        const updatedSets = [...state.completedSets, completedSet];
        const isFinalSet = state.currentSet >= state.config.totalSets;

        if (isFinalSet) {
          return {
            ...state,
            lifecycle: "WORKOUT_COMPLETED",
            currentSetReps: nextSetReps,
            totalReps: nextTotalReps,
            completedSets: updatedSets,
            activeDurationMs: state.activeDurationMs + delta,
            activeSegmentStartedAtMs: null,
            completedAtIso: action.nowIso,
            completionStatus: "COMPLETED",
            poseDetected: true,
            lastMetrics: action.result.metrics,
            lastFormIssues: action.result.formIssues,
            lastPhase: action.result.phase,
          };
        }

        return {
          ...state,
          lifecycle: "SET_COMPLETED",
          currentSetReps: nextSetReps,
          totalReps: nextTotalReps,
          completedSets: updatedSets,
          activeDurationMs: state.activeDurationMs + delta,
          activeSegmentStartedAtMs: null,
          restSecondsRemaining: state.config.restDuration,
          poseDetected: true,
          lastMetrics: action.result.metrics,
          lastFormIssues: action.result.formIssues,
          lastPhase: action.result.phase,
        };
      }

      return {
        ...state,
        currentSetReps: nextSetReps,
        totalReps: nextTotalReps,
        poseDetected: true,
        lastMetrics: action.result.metrics,
        lastFormIssues: action.result.formIssues,
        lastPhase: action.result.phase,
      };
    }

    case "TICK_REST": {
      if (state.lifecycle !== "SET_COMPLETED") return state;
      if (state.restSecondsRemaining <= 1) {
        return {
          ...state,
          lifecycle: "ACTIVE",
          currentSet: state.currentSet + 1,
          currentSetReps: 0,
          restSecondsRemaining: 0,
          activeSegmentStartedAtMs: action.nowMs,
          currentSetStartedAtMs: action.nowMs,
        };
      }
      return {
        ...state,
        restSecondsRemaining: state.restSecondsRemaining - 1,
      };
    }

    case "START_NEXT_SET":
      if (state.lifecycle !== "SET_COMPLETED") return state;
      return {
        ...state,
        lifecycle: "ACTIVE",
        currentSet: state.currentSet + 1,
        currentSetReps: 0,
        restSecondsRemaining: 0,
        activeSegmentStartedAtMs: action.nowMs,
        currentSetStartedAtMs: action.nowMs,
      };

    case "END_EARLY": {
      if (
        state.lifecycle !== "ACTIVE" &&
        state.lifecycle !== "PAUSED" &&
        state.lifecycle !== "SET_COMPLETED"
      ) {
        return state;
      }

      const delta =
        state.lifecycle === "ACTIVE" && state.activeSegmentStartedAtMs !== null
          ? Math.max(0, action.nowMs - state.activeSegmentStartedAtMs)
          : 0;

      const finalSets = [...state.completedSets];
      if (state.lifecycle !== "SET_COMPLETED" && state.currentSetReps > 0) {
        finalSets.push({
          setNumber: state.currentSet,
          reps: state.currentSetReps,
          completedAt: action.nowIso,
        });
      }

      const reachedAllSets = state.completedSets.length >= state.config.totalSets;

      return {
        ...state,
        lifecycle: "WORKOUT_COMPLETED",
        completedSets: finalSets,
        activeDurationMs: state.activeDurationMs + delta,
        activeSegmentStartedAtMs: null,
        completedAtIso: action.nowIso,
        completionStatus: reachedAllSets ? "COMPLETED" : "INTERRUPTED",
      };
    }

    case "RESET":
      return createInitialWorkoutState(
        action.config ?? state.config,
        action.idempotencyKey
      );
  }
}

export function buildWorkoutPersistencePayload(
  state: WorkoutSessionState,
  nowMs: number,
  notes?: string
): CreateWorkoutInput {
  const durationSeconds = getElapsedActiveSeconds(state, nowMs);
  const startedAt = state.startedAtIso ?? new Date().toISOString();
  const completedAt = state.completedAtIso ?? new Date().toISOString();

  // Keep only bounded primitive summary metrics (never landmarks)
  const boundedMetrics: Record<string, number | boolean | string> = {};
  for (const [k, v] of Object.entries(state.lastMetrics).slice(0, 12)) {
    if (
      typeof v === "boolean" ||
      (typeof v === "number" && Number.isFinite(v)) ||
      typeof v === "string"
    ) {
      boundedMetrics[k.slice(0, 40)] =
        typeof v === "string" ? v.slice(0, 64) : v;
    }
  }

  return {
    idempotencyKey: state.idempotencyKey,
    exerciseName: state.config.exercise,
    status: state.completionStatus ?? "INTERRUPTED",
    targetReps: state.config.targetReps,
    targetSets: state.config.totalSets,
    totalReps: state.totalReps,
    totalSets: state.completedSets.length,
    durationSeconds,
    startedAt,
    completedAt,
    sets: state.completedSets,
    ...(Object.keys(boundedMetrics).length > 0
      ? { exerciseMetrics: boundedMetrics }
      : {}),
    ...(notes?.trim() ? { notes: notes.trim().slice(0, 500) } : {}),
  };
}
