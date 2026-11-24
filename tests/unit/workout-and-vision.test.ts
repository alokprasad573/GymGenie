import { describe, expect, it, vi } from "vitest";
import {
  buildWorkoutPersistencePayload,
  createInitialWorkoutState,
  getElapsedActiveSeconds,
  workoutSessionReducer,
} from "@/features/workout/workout-state-machine";
import { VoiceFeedbackController } from "@/features/workout/voice-feedback";
import { mapCameraError, stopMediaStream } from "@/features/exercise/camera-controller";
import type { ExerciseFrameResult, WorkoutConfig } from "@/types/exercise";

const BASE_CONFIG: WorkoutConfig = {
  exercise: "squats",
  targetReps: 2,
  totalSets: 2,
  restDuration: 3,
  enableVoice: true,
  enableAiCoaching: true,
};

function makeRepFrame(repCount: number, repCompleted: boolean): ExerciseFrameResult {
  return {
    exercise: "squats",
    repCount,
    phase: repCompleted ? "up" : "down",
    stage: repCompleted ? "up" : "down",
    metrics: { kneeAngle: repCompleted ? 170 : 88, backAngle: 165, depthStatus: "GOOD DEPTH" },
    legacyMetrics: { reps: repCount, knee_angle: 170, back_angle: 165, depth_status: "GOOD DEPTH" },
    formIssues: [],
    repCompleted,
    landmarksValid: true,
  };
}

describe("Phase 6, 8 & 10 — Workout State Machine, Camera Cleanup & Voice Feedback", () => {
  it("transitions IDLE -> INITIALIZING -> READY -> ACTIVE <-> PAUSED -> SET_COMPLETED -> ACTIVE -> WORKOUT_COMPLETED with accurate monotonic duration", () => {
    let state = createInitialWorkoutState(BASE_CONFIG, "idemp-session-001");
    expect(state.lifecycle).toBe("IDLE");

    state = workoutSessionReducer(state, { type: "INIT_START" });
    expect(state.lifecycle).toBe("INITIALIZING");

    state = workoutSessionReducer(state, { type: "INIT_READY" });
    expect(state.lifecycle).toBe("READY");

    state = workoutSessionReducer(state, {
      type: "BEGIN_WORKOUT",
      nowMs: 1_000,
      nowIso: "2026-11-23T10:00:00.000Z",
    });
    expect(state.lifecycle).toBe("ACTIVE");

    // Rep 1 after 5s
    state = workoutSessionReducer(state, {
      type: "FRAME_PROCESSED",
      result: makeRepFrame(1, true),
      nowMs: 6_000,
      nowIso: "2026-11-23T10:00:05.000Z",
    });
    expect(state.currentSetReps).toBe(1);
    expect(state.totalReps).toBe(1);

    // Pause at 10s (active = 9s), resume at 20s (pause duration excluded!)
    state = workoutSessionReducer(state, { type: "PAUSE", nowMs: 10_000 });
    expect(state.lifecycle).toBe("PAUSED");
    expect(getElapsedActiveSeconds(state, 18_000)).toBe(9);

    state = workoutSessionReducer(state, { type: "RESUME", nowMs: 20_000 });
    expect(state.lifecycle).toBe("ACTIVE");

    // Rep 2 at 25s -> completes Set 1 (active = 9 + 5 = 14s)
    state = workoutSessionReducer(state, {
      type: "FRAME_PROCESSED",
      result: makeRepFrame(2, true),
      nowMs: 25_000,
      nowIso: "2026-11-23T10:00:25.000Z",
    });
    expect(state.lifecycle).toBe("SET_COMPLETED");
    expect(state.completedSets).toHaveLength(1);
    expect(state.restSecondsRemaining).toBe(3);

    // Rest countdown ticks down to Set 2
    state = workoutSessionReducer(state, { type: "TICK_REST", nowMs: 26_000 });
    expect(state.restSecondsRemaining).toBe(2);
    state = workoutSessionReducer(state, { type: "START_NEXT_SET", nowMs: 30_000 });
    expect(state.lifecycle).toBe("ACTIVE");
    expect(state.currentSet).toBe(2);
    expect(state.currentSetReps).toBe(0);

    // Set 2 reps
    state = workoutSessionReducer(state, {
      type: "FRAME_PROCESSED",
      result: makeRepFrame(3, true),
      nowMs: 33_000,
      nowIso: "2026-11-23T10:00:33.000Z",
    });
    state = workoutSessionReducer(state, {
      type: "FRAME_PROCESSED",
      result: makeRepFrame(4, true),
      nowMs: 36_000,
      nowIso: "2026-11-23T10:00:36.000Z",
    });
    expect(state.lifecycle).toBe("WORKOUT_COMPLETED");
    expect(state.completionStatus).toBe("COMPLETED");
    expect(state.totalReps).toBe(4);
    expect(state.completedSets).toHaveLength(2);

    const payload = buildWorkoutPersistencePayload(state, 36_000);
    // 9s + 5s (Set 1) + 6s (Set 2) = 20s (pause & rest excluded!)
    expect(payload.durationSeconds).toBe(20);
    expect(payload.idempotencyKey).toBe("idemp-session-001");
    expect(payload.status).toBe("COMPLETED");
  });

  it("captures partial reps as INTERRUPTED on early end", () => {
    let state = createInitialWorkoutState(BASE_CONFIG, "idemp-early-002");
    state = workoutSessionReducer(state, { type: "INIT_START" });
    state = workoutSessionReducer(state, { type: "INIT_READY" });
    state = workoutSessionReducer(state, {
      type: "BEGIN_WORKOUT",
      nowMs: 1_000,
      nowIso: "2026-11-23T10:00:00.000Z",
    });
    state = workoutSessionReducer(state, {
      type: "FRAME_PROCESSED",
      result: makeRepFrame(1, true),
      nowMs: 4_000,
      nowIso: "2026-11-23T10:00:03.000Z",
    });
    state = workoutSessionReducer(state, {
      type: "END_EARLY",
      nowMs: 6_000,
      nowIso: "2026-11-23T10:00:05.000Z",
    });

    expect(state.lifecycle).toBe("WORKOUT_COMPLETED");
    expect(state.completionStatus).toBe("INTERRUPTED");
    expect(state.completedSets).toEqual([
      { setNumber: 1, reps: 1, completedAt: "2026-11-23T10:00:05.000Z" },
    ]);
  });

  it("maps camera errors into actionable messages and stops media stream tracks cleanly", () => {
    const stopA = vi.fn();
    const stopB = vi.fn();
    const fakeStream = {
      getTracks: () => [{ stop: stopA }, { stop: stopB }],
    } as unknown as MediaStream;

    stopMediaStream(fakeStream);
    expect(stopA).toHaveBeenCalledTimes(1);
    expect(stopB).toHaveBeenCalledTimes(1);

    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn() },
    });

    const denied = mapCameraError(new DOMException("Denied", "NotAllowedError"));
    expect(denied.code).toBe("PERMISSION_DENIED");
    expect(denied.guidance).toContain("Allow camera access");
  });

  it("deduplicates speech cues via cooldown and handles unsupported browsers safely", () => {
    const speakMock = vi.fn();
    const cancelMock = vi.fn();

    class MockUtterance {
      text: string;
      lang = "";
      rate = 1;
      pitch = 1;
      constructor(text: string) {
        this.text = text;
      }
    }

    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: { speak: speakMock, cancel: cancelMock },
    });
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      configurable: true,
      value: MockUtterance,
    });

    const voice = new VoiceFeedbackController({
      enabled: true,
      defaultCooldownMs: 5_000,
    });

    expect(voice.speak("Keep your chest tall", "form:squats", { nowMs: 10_000 })).toBe(true);
    // Repeated same event inside cooldown -> suppressed
    expect(voice.speak("Keep your chest tall", "form:squats", { nowMs: 12_000 })).toBe(false);
    // Priority announcement bypasses cooldown and cancels prior
    expect(
      voice.speak("Set 1 complete", "set:1", { priority: true, nowMs: 12_500 })
    ).toBe(true);
    expect(cancelMock).toHaveBeenCalledTimes(1);
    expect(speakMock).toHaveBeenCalledTimes(2);

    // Disabling voice cancels active speech and suppresses further announcements
    voice.setEnabled(false);
    expect(voice.speak("Rep 3", "rep:3", { nowMs: 20_000 })).toBe(false);
  });
});
