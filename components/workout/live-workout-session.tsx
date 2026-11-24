"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Pause,
  Play,
  RefreshCw,
  SkipForward,
  Square,
  Volume2,
  VolumeX,
} from "lucide-react";
import { PageChoreography } from "@/components/animations/page-choreography";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { EXERCISES } from "@/config/exercises";
import { apiFetch, ClientRequestError } from "@/features/auth/auth-api-client";
import {
  enumerateVideoDevices,
  type CameraErrorInfo,
  type VideoDeviceOption,
} from "@/features/exercise/camera-controller";
import { PoseVisionController } from "@/features/exercise/pose-vision-controller";
import { renderPoseOverlay } from "@/features/exercise/skeleton-renderer";
import { VoiceFeedbackController } from "@/features/workout/voice-feedback";
import { loadWorkoutConfig } from "@/features/workout/workout-config-store";
import {
  buildWorkoutPersistencePayload,
  createInitialWorkoutState,
  getElapsedActiveSeconds,
  workoutSessionReducer,
  type WorkoutSessionState,
} from "@/features/workout/workout-state-machine";
import { formatDuration, formatTimerClock } from "@/lib/utils";
import { createExerciseDetector } from "@/services/exercise/detector-factory";
import type {
  CoachingEventType,
  ExerciseDetector,
  ExerciseFrameResult,
  PoseLandmark,
  WorkoutConfig,
} from "@/types/exercise";
import type { WorkoutDTO } from "@/types/dto";

function createSessionIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `gg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildOverlayBanner(
  exercise: WorkoutConfig["exercise"],
  result: ExerciseFrameResult
): string {
  const m = result.legacyMetrics;
  switch (exercise) {
    case "squats":
      return `DEPTH: ${String(m.depth_status ?? "N/A")} · KNEE ${String(m.knee_angle ?? 0)}°`;
    case "pushups":
      return `BODY: ${String(m.body_alignment ?? "N/A")} · HIP: ${String(m.hip_status ?? "N/A")}`;
    case "biceps_curls":
      return `SWING: ${String(m.swing_status ?? "N/A")} · ELBOW ${String(m.elbow_angle ?? 0)}°`;
    case "shoulder_press":
      return `EXT: ${String(m.extension_status ?? "N/A")} · BACK: ${String(m.back_arch_status ?? "N/A")}`;
    case "lunges":
      return `BALANCE: ${String(m.balance_status ?? "N/A")} · KNEE ${String(m.front_knee_angle ?? 0)}°`;
  }
}

export function LiveWorkoutSession() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { pushToast } = useToast();

  const initialConfig = React.useMemo<WorkoutConfig>(() => loadWorkoutConfig(), []);
  const [state, dispatch] = React.useReducer(
    workoutSessionReducer,
    undefined,
    () => createInitialWorkoutState(initialConfig, createSessionIdempotencyKey())
  );

  const stateRef = React.useRef<WorkoutSessionState>(state);
  React.useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const visionRef = React.useRef<PoseVisionController | null>(null);
  const detectorRef = React.useRef<ExerciseDetector>(
    createExerciseDetector(initialConfig.exercise)
  );
  const voiceRef = React.useRef<VoiceFeedbackController | null>(null);
  const lastUiPublishRef = React.useRef<number>(0);
  const lastCoachCallRef = React.useRef<number>(0);
  const savedOnceRef = React.useRef<boolean>(false);

  const [cameraError, setCameraError] = React.useState<CameraErrorInfo | null>(null);
  const [devices, setDevices] = React.useState<VideoDeviceOption[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = React.useState<string>(
    searchParams.get("deviceId") ?? ""
  );
  const [fps, setFps] = React.useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = React.useState<number>(0);
  const [voiceEnabled, setVoiceEnabled] = React.useState<boolean>(
    initialConfig.enableVoice
  );
  const [aiEnabled, setAiEnabled] = React.useState<boolean>(
    initialConfig.enableAiCoaching
  );
  const [coachBanner, setCoachBanner] = React.useState<{
    text: string;
    source: "groq" | "fallback";
  } | null>(null);
  const [confirmEndOpen, setConfirmEndOpen] = React.useState(false);
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [savedWorkout, setSavedWorkout] = React.useState<WorkoutDTO | null>(null);

  const exerciseDef = EXERCISES[state.config.exercise];

  // Voice controller lifecycle
  React.useEffect(() => {
    voiceRef.current = new VoiceFeedbackController({
      enabled: initialConfig.enableVoice,
      defaultCooldownMs: 4_500,
    });
    return () => {
      voiceRef.current?.cancel();
    };
  }, [initialConfig.enableVoice]);

  React.useEffect(() => {
    voiceRef.current?.setEnabled(voiceEnabled);
  }, [voiceEnabled]);

  const requestCoachingCue = React.useCallback(
    async (
      event: CoachingEventType,
      issue?: string | null,
      options?: { priority?: boolean }
    ) => {
      const current = stateRef.current;
      const isMajor =
        event === "workout_started" ||
        event === "set_completed" ||
        event === "workout_completed";

      const now = Date.now();
      if (!isMajor && now - lastCoachCallRef.current < 5_000) {
        return;
      }
      lastCoachCallRef.current = now;

      if (!aiEnabled) {
        if (issue) {
          setCoachBanner({ text: issue, source: "fallback" });
          voiceRef.current?.speak(issue, `local:${event}:${issue}`, {
            priority: options?.priority,
          });
        }
        return;
      }

      try {
        const res = await apiFetch<{
          feedback: string;
          source: "groq" | "fallback";
          throttled: boolean;
        }>("/api/ai/coaching", {
          method: "POST",
          body: JSON.stringify({
            event,
            exercise: current.config.exercise,
            repCount: current.totalReps,
            currentSet: current.currentSet,
            targetSets: current.config.totalSets,
            issue: issue ?? undefined,
          }),
        });

        if (!res.throttled && res.feedback) {
          setCoachBanner({ text: res.feedback, source: res.source });
          voiceRef.current?.speak(res.feedback, `coach:${event}`, {
            priority: options?.priority ?? isMajor,
          });
        }
      } catch {
        // Coaching failures must NEVER interrupt the workout
        if (issue) {
          setCoachBanner({ text: issue, source: "fallback" });
          voiceRef.current?.speak(issue, `fallback:${event}`, {
            priority: options?.priority,
          });
        }
      }
    },
    [aiEnabled]
  );

  // Process a single set of 33 pose landmarks (from MediaPipe or E2E synthetic stream)
  const handleLandmarks = React.useCallback(
    (landmarks: PoseLandmark[] | null) => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const current = stateRef.current;

      if (canvas && video && video.videoWidth > 0 && video.videoHeight > 0) {
        if (
          canvas.width !== video.videoWidth ||
          canvas.height !== video.videoHeight
        ) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }
      }

      if (!landmarks) {
        if (canvas) {
          renderPoseOverlay(canvas, null, {
            mirrored: true,
            poseDetected: false,
          });
        }
        const now = performance.now();
        if (now - lastUiPublishRef.current > 250) {
          lastUiPublishRef.current = now;
          dispatch({ type: "NO_POSE" });
          if (current.lifecycle === "ACTIVE") {
            void requestCoachingCue(
              "no_pose_detected",
              "No pose detected. Step back into full camera view."
            );
          }
        }
        return;
      }

      const detector = detectorRef.current;
      const result = detector.process(landmarks);

      if (canvas) {
        renderPoseOverlay(canvas, landmarks, {
          mirrored: true,
          poseDetected: true,
          statusBanner: buildOverlayBanner(current.config.exercise, result),
        });
      }

      const nowMs = performance.now();
      const shouldPublish =
        result.repCompleted ||
        result.phase !== current.lastPhase ||
        nowMs - lastUiPublishRef.current >= 140;

      if (!shouldPublish) {
        return;
      }

      lastUiPublishRef.current = nowMs;
      const prevSetCount = current.completedSets.length;
      const prevLifecycle = current.lifecycle;

      dispatch({
        type: "FRAME_PROCESSED",
        result,
        nowMs,
        nowIso: new Date().toISOString(),
      });

      if (prevLifecycle === "ACTIVE") {
        if (result.repCompleted) {
          const nextSetReps = current.currentSetReps + 1;
          if (nextSetReps >= current.config.targetReps) {
            const isFinal = current.currentSet >= current.config.totalSets;
            detector.reset();
            if (isFinal) {
              void requestCoachingCue("workout_completed", null, {
                priority: true,
              });
            } else {
              void requestCoachingCue("set_completed", null, {
                priority: true,
              });
            }
          } else {
            voiceRef.current?.speak(
              `Rep ${nextSetReps}`,
              `rep:${prevSetCount}:${nextSetReps}`,
              { cooldownMs: 500 }
            );
          }
        } else if (result.formIssues[0]) {
          void requestCoachingCue("ongoing_form_check", result.formIssues[0]);
        }
      }
    },
    [requestCoachingCue]
  );

  // Connect camera and MediaPipe PoseLandmarker without synchronous pre-await state updates
  const connectVision = React.useCallback(
    async (deviceId?: string) => {
      visionRef.current?.dispose();
      const controller = new PoseVisionController({
        onLandmarks: (lms) => handleLandmarks(lms),
        onError: (errInfo) => {
          setCameraError(errInfo);
          dispatch({ type: "INIT_ERROR", message: errInfo.title });
        },
        onFpsUpdate: (nextFps) => setFps(nextFps),
      });
      visionRef.current = controller;

      const video = videoRef.current;
      if (!video) return;

      const ok = await controller.initialize(video, deviceId || undefined);
      if (visionRef.current !== controller) {
        controller.dispose();
        return;
      }
      if (ok) {
        const list = await enumerateVideoDevices();
        if (visionRef.current !== controller) return;
        setDevices(list);
        dispatch({ type: "INIT_READY" });
      }
    },
    [handleLandmarks]
  );

  // User-triggered re-initialization (Retry button or camera device switch)
  const initializeVision = React.useCallback(
    async (deviceId?: string) => {
      dispatch({ type: "INIT_START" });
      setCameraError(null);
      await connectVision(deviceId);
    },
    [connectVision]
  );

  React.useEffect(() => {
    void connectVision(selectedDeviceId || undefined);
    return () => {
      visionRef.current?.dispose();
      visionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Deterministic E2E frame event bridge (consumes real detectors & reducer without exposing mock UI)
  React.useEffect(() => {
    const onSyntheticFrame = (evt: Event) => {
      const detail = (evt as CustomEvent<{ landmarks: PoseLandmark[] | null }>)
        .detail;
      if (stateRef.current.lifecycle === "INITIALIZING" || stateRef.current.lifecycle === "ERROR") {
        dispatch({ type: "INIT_READY" });
      }
      handleLandmarks(detail?.landmarks ?? null);
    };
    window.addEventListener("gymgenie:pose-frame", onSyntheticFrame);
    return () => {
      window.removeEventListener("gymgenie:pose-frame", onSyntheticFrame);
    };
  }, [handleLandmarks]);

  // Elapsed active timer & rest countdown intervals
  React.useEffect(() => {
    const id = window.setInterval(() => {
      const current = stateRef.current;
      setElapsedSeconds(getElapsedActiveSeconds(current, performance.now()));
      if (current.lifecycle === "SET_COMPLETED") {
        if (
          current.restSecondsRemaining === 10 ||
          current.restSecondsRemaining === 3
        ) {
          voiceRef.current?.speak(
            `${current.restSecondsRemaining} seconds left in rest`,
            `rest:${current.currentSet}:${current.restSecondsRemaining}`,
            { cooldownMs: 900 }
          );
        }
        dispatch({ type: "TICK_REST", nowMs: performance.now() });
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  // Persist completed or interrupted workout idempotently
  const persistWorkout = React.useCallback(
    async (noteOverride?: string) => {
      setSaving(true);
      setSaveError(null);
      try {
        const payload = buildWorkoutPersistencePayload(
          stateRef.current,
          performance.now(),
          noteOverride ?? notes
        );
        const res = await apiFetch<{ workout: WorkoutDTO; created: boolean }>(
          "/api/workouts",
          {
            method: "POST",
            body: JSON.stringify(payload),
          }
        );
        setSavedWorkout(res.workout);
        pushToast({
          title: "Workout saved",
          description: `${res.workout.totalReps} reps recorded to your history.`,
          variant: "success",
        });
      } catch (err) {
        const message =
          err instanceof ClientRequestError
            ? err.message
            : "Could not save workout. Click Retry save to submit again safely.";
        setSaveError(message);
      } finally {
        setSaving(false);
      }
    },
    [notes, pushToast]
  );

  // Auto-save once on entering WORKOUT_COMPLETED
  React.useEffect(() => {
    if (state.lifecycle === "WORKOUT_COMPLETED" && !savedOnceRef.current) {
      savedOnceRef.current = true;
      visionRef.current?.stopLoop();
      void persistWorkout();
    }
  }, [state.lifecycle, persistWorkout]);

  function handleBeginWorkout() {
    detectorRef.current.reset();
    dispatch({
      type: "BEGIN_WORKOUT",
      nowMs: performance.now(),
      nowIso: new Date().toISOString(),
    });
    void requestCoachingCue("workout_started", null, { priority: true });
  }

  function handlePauseResume() {
    if (state.lifecycle === "ACTIVE") {
      dispatch({ type: "PAUSE", nowMs: performance.now() });
      voiceRef.current?.cancel();
    } else if (state.lifecycle === "PAUSED") {
      dispatch({ type: "RESUME", nowMs: performance.now() });
    }
  }

  function handleEndEarlyConfirmed() {
    setConfirmEndOpen(false);
    dispatch({
      type: "END_EARLY",
      nowMs: performance.now(),
      nowIso: new Date().toISOString(),
    });
    void requestCoachingCue("workout_completed", null, { priority: true });
  }

  async function handleSaveNotes() {
    if (!savedWorkout) {
      await persistWorkout(notes);
      return;
    }
    setSaving(true);
    try {
      const updated = await apiFetch<{ workout: WorkoutDTO }>(
        `/api/workouts/${savedWorkout.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ notes }),
        }
      );
      setSavedWorkout(updated.workout);
      pushToast({ title: "Session notes updated", variant: "success" });
    } catch {
      pushToast({
        title: "Could not save notes",
        description: "Please try again.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  const lifecycleLabel: Record<WorkoutSessionState["lifecycle"], string> = {
    IDLE: "Idle",
    INITIALIZING: "Initializing camera",
    READY: "Ready",
    ACTIVE: "Active",
    PAUSED: "Paused",
    SET_COMPLETED: "Rest period",
    WORKOUT_COMPLETED: "Finished",
    ERROR: "Camera error",
  };

  return (
    <div className="space-y-5">
      {/* Top session bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-medium tracking-[-0.02em] text-ink-primary sm:text-2xl">
            {exerciseDef.label}
          </h1>
          <Badge
            variant={
              state.lifecycle === "ACTIVE"
                ? "accent"
                : state.lifecycle === "ERROR"
                  ? "danger"
                  : state.lifecycle === "SET_COMPLETED"
                    ? "warning"
                    : "neutral"
            }
            liveDot={state.lifecycle === "ACTIVE"}
          >
            {lifecycleLabel[state.lifecycle]}
          </Badge>
          {fps > 0 && state.lifecycle !== "WORKOUT_COMPLETED" ? (
            <span className="text-xs font-medium text-ink-muted tabular-nums">
              {fps} fps
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setVoiceEnabled((v) => !v)}
            aria-pressed={voiceEnabled}
          >
            {voiceEnabled ? (
              <Volume2 className="h-4 w-4 text-accent" strokeWidth={1.5} />
            ) : (
              <VolumeX className="h-4 w-4 text-ink-muted" strokeWidth={1.5} />
            )}
            {voiceEnabled ? "Voice on" : "Voice muted"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setAiEnabled((v) => !v)}
            aria-pressed={aiEnabled}
          >
            {aiEnabled ? "AI coach on" : "AI coach off"}
          </Button>
        </div>
      </div>

      {state.lifecycle === "WORKOUT_COMPLETED" ? (
        <PageChoreography revealKey="workout-summary">
          <Card
            data-stagger-item
            className="gg-stage-frame mx-auto max-w-2xl"
          >
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    className="h-5 w-5 text-accent"
                    strokeWidth={1.75}
                  />
                  <CardTitle className="text-xl">Workout summary</CardTitle>
                </div>
                <Badge
                  variant={
                    state.completionStatus === "COMPLETED" ? "accent" : "warning"
                  }
                >
                  {state.completionStatus === "COMPLETED"
                    ? "Completed"
                    : "Interrupted"}
                </Badge>
              </div>
              <CardDescription>
                {exerciseDef.label} · {formatDuration(elapsedSeconds)} active time
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div
                  data-stagger-item
                  className="rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-canvas p-4"
                >
                  <span className="text-xs text-ink-muted">Total reps</span>
                  <p className="mt-1 text-2xl font-medium text-accent tabular-nums">
                    {state.totalReps}
                  </p>
                </div>
                <div
                  data-stagger-item
                  className="rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-canvas p-4"
                >
                  <span className="text-xs text-ink-muted">Sets logged</span>
                  <p className="mt-1 text-2xl font-medium text-ink-primary tabular-nums">
                    {state.completedSets.length} / {state.config.totalSets}
                  </p>
                </div>
                <div
                  data-stagger-item
                  className="col-span-2 rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-canvas p-4 sm:col-span-1"
                >
                  <span className="text-xs text-ink-muted">Active duration</span>
                  <p className="mt-1 text-2xl font-medium text-ink-primary tabular-nums">
                    {formatTimerClock(elapsedSeconds)}
                  </p>
                </div>
              </div>

              {state.completedSets.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-ink-muted">Set breakdown</p>
                  <div className="divide-y divide-[rgba(255,255,255,0.06)] rounded-[10px] border border-[rgba(255,255,255,0.08)] bg-canvas">
                    {state.completedSets.map((s) => (
                      <div
                        key={s.setNumber}
                        className="flex items-center justify-between px-4 py-2.5 text-sm"
                      >
                        <span className="text-ink-secondary">
                          Set {s.setNumber}
                        </span>
                        <span className="font-medium text-ink-primary tabular-nums">
                          {s.reps} reps
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {saveError ? (
                <div
                  role="alert"
                  className="flex items-center justify-between gap-3 rounded-[10px] border border-status-danger/35 bg-[#2B1517]/60 p-3.5 text-sm text-[#FCA5A5]"
                >
                  <span>{saveError}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={saving}
                    onClick={() => void persistWorkout()}
                  >
                    Retry save
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-ink-secondary">
                  {saving
                    ? "Saving workout to MongoDB..."
                    : savedWorkout
                      ? "Saved to your workout history."
                      : "Pending save..."}
                </p>
              )}

              <div className="space-y-2">
                <label
                  htmlFor="sessionNotes"
                  className="block text-xs text-ink-secondary"
                >
                  Session notes (optional)
                </label>
                <textarea
                  id="sessionNotes"
                  suppressHydrationWarning
                  rows={3}
                  maxLength={500}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Note how depth, tempo, or stability felt..."
                  className="w-full rounded-[8px] border border-[rgba(255,255,255,0.1)] bg-canvas p-3 text-sm text-ink-primary placeholder:text-ink-muted focus:border-accent focus:outline-none"
                />
                {notes.trim() ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={saving}
                    onClick={() => void handleSaveNotes()}
                  >
                    Save notes
                  </Button>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(255,255,255,0.06)] pt-4">
                <Button asChild variant="secondary" className="w-full sm:w-auto">
                  <Link href="/history">View workout history</Link>
                </Button>
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 sm:flex-initial"
                    onClick={() => router.push("/workout/setup")}
                  >
                    New workout
                  </Button>
                  <Button asChild variant="primary" className="flex-1 sm:flex-initial">
                    <Link href="/dashboard">Back to dashboard</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </PageChoreography>
      ) : (
        <div className="grid gap-5 lg:grid-cols-12">
          {/* Camera & Canvas Stage */}
          <div className="min-w-0 space-y-4 lg:col-span-8">
            <div className="relative aspect-[4/3] min-h-[260px] w-full overflow-hidden rounded-[16px] border border-[rgba(255,255,255,0.1)] bg-[#050605] sm:aspect-video sm:min-h-0">
              <video
                id="webcam"
                ref={videoRef}
                muted
                playsInline
                className="h-full w-full scale-x-[-1] object-cover"
              />
              <canvas
                ref={canvasRef}
                className="pointer-events-none absolute inset-0 h-full w-full object-cover"
              />

              {state.lifecycle === "INITIALIZING" ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-canvas/85 p-6 text-center">
                  <RefreshCw
                    className="h-6 w-6 animate-spin text-accent"
                    strokeWidth={1.5}
                  />
                  <p className="text-sm font-medium text-ink-primary">
                    Initializing camera and MediaPipe Pose Landmarker
                  </p>
                  <p className="text-xs text-ink-secondary">
                    All video frames remain local in your browser
                  </p>
                </div>
              ) : null}

              {state.lifecycle === "ERROR" && cameraError ? (
                <div
                  role="alert"
                  className="absolute inset-0 flex flex-col items-center justify-center gap-3 overflow-y-auto bg-canvas/95 p-5 text-center sm:gap-4 sm:p-6"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] border border-status-danger/35 bg-[#2B1517]">
                    <AlertCircle
                      className="h-5 w-5 text-status-danger"
                      strokeWidth={1.5}
                    />
                  </div>
                  <div className="max-w-md space-y-1.5">
                    <h2 className="text-base font-medium text-ink-primary">
                      {cameraError.title}
                    </h2>
                    <p className="text-sm text-ink-secondary">
                      {cameraError.guidance}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2.5">
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() =>
                        void initializeVision(selectedDeviceId || undefined)
                      }
                    >
                      <RefreshCw className="h-4 w-4" strokeWidth={1.5} />
                      Retry camera
                    </Button>
                    <Button asChild variant="secondary">
                      <Link href="/workout/setup">Return to setup</Link>
                    </Button>
                  </div>
                </div>
              ) : null}

              {state.lifecycle === "SET_COMPLETED" ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 overflow-y-auto bg-canvas/85 p-5 text-center backdrop-blur-[2px] sm:gap-4 sm:p-6">
                  <Badge variant="accent">
                    Set {state.currentSet} complete
                  </Badge>
                  <div className="space-y-1">
                    <p className="text-sm text-ink-secondary">
                      Rest before Set {state.currentSet + 1} of{" "}
                      {state.config.totalSets}
                    </p>
                    <p className="text-4xl font-semibold text-ink-primary tabular-nums sm:text-5xl">
                      {formatTimerClock(state.restSecondsRemaining)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() =>
                      dispatch({
                        type: "START_NEXT_SET",
                        nowMs: performance.now(),
                      })
                    }
                  >
                    <SkipForward className="h-4 w-4" strokeWidth={1.5} />
                    Start Set {state.currentSet + 1} now
                  </Button>
                </div>
              ) : null}
            </div>

            {/* Session Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-surface p-4">
              <div className="flex flex-wrap items-center gap-2.5">
                {state.lifecycle === "READY" || state.lifecycle === "IDLE" ? (
                  <Button
                    type="button"
                    size="lg"
                    variant="primary"
                    onClick={handleBeginWorkout}
                    data-testid="begin-workout-btn"
                  >
                    <Play className="h-4 w-4" strokeWidth={1.75} />
                    Start Set 1
                  </Button>
                ) : null}

                {state.lifecycle === "ACTIVE" || state.lifecycle === "PAUSED" ? (
                  <>
                    <Button
                      type="button"
                      size="lg"
                      variant={
                        state.lifecycle === "PAUSED" ? "primary" : "secondary"
                      }
                      onClick={handlePauseResume}
                      data-testid="pause-resume-btn"
                    >
                      {state.lifecycle === "PAUSED" ? (
                        <>
                          <Play className="h-4 w-4" strokeWidth={1.75} />
                          Resume
                        </>
                      ) : (
                        <>
                          <Pause className="h-4 w-4" strokeWidth={1.75} />
                          Pause
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="lg"
                      variant="destructive"
                      onClick={() => setConfirmEndOpen(true)}
                      data-testid="end-workout-btn"
                    >
                      <Square className="h-3.5 w-3.5" strokeWidth={1.75} />
                      End workout
                    </Button>
                  </>
                ) : null}

                {state.lifecycle === "SET_COMPLETED" ? (
                  <Button
                    type="button"
                    size="lg"
                    variant="destructive"
                    onClick={() => setConfirmEndOpen(true)}
                  >
                    <Square className="h-3.5 w-3.5" strokeWidth={1.75} />
                    Finish early
                  </Button>
                ) : null}
              </div>

              {devices.length > 1 ? (
                <div className="w-full sm:w-52">
                  <Select
                    value={selectedDeviceId}
                    onValueChange={(nextId) => {
                      setSelectedDeviceId(nextId);
                      void initializeVision(nextId);
                    }}
                  >
                    <SelectTrigger aria-label="Switch camera">
                      <SelectValue placeholder="Switch camera" />
                    </SelectTrigger>
                    <SelectContent>
                      {devices.map((d) => (
                        <SelectItem key={d.deviceId} value={d.deviceId}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>
          </div>

          {/* Right Telemetry HUD */}
          <div className="min-w-0 space-y-4 lg:col-span-4">
            <Card>
              <CardContent className="grid grid-cols-2 gap-3 p-4 sm:p-5">
                <div className="min-w-0 rounded-[8px] border border-[rgba(255,255,255,0.06)] bg-canvas p-3.5 sm:p-4">
                  <span className="text-xs text-ink-muted">Set reps</span>
                  <p
                    data-testid="live-rep-count"
                    className="mt-1 text-2xl font-medium text-accent tabular-nums sm:text-3xl"
                  >
                    {state.currentSetReps}
                    <span className="text-base font-normal text-ink-muted">
                      /{state.config.targetReps}
                    </span>
                  </p>
                  <div
                    className="mt-3 h-1 w-full overflow-hidden rounded-full bg-elevated"
                    aria-hidden="true"
                  >
                    <div
                      className="h-full w-full origin-left rounded-full bg-accent transition-transform duration-150"
                      style={{
                        transform: `scaleX(${Math.min(
                          1,
                          state.currentSetReps /
                          Math.max(1, state.config.targetReps)
                        )})`,
                      }}
                    />
                  </div>
                </div>

                <div className="min-w-0 rounded-[8px] border border-[rgba(255,255,255,0.06)] bg-canvas p-3.5 sm:p-4">
                  <span className="text-xs text-ink-muted">Current set</span>
                  <p
                    data-testid="live-set-count"
                    className="mt-1 text-2xl font-medium text-ink-primary tabular-nums sm:text-3xl"
                  >
                    {state.currentSet}
                    <span className="text-base font-normal text-ink-muted">
                      /{state.config.totalSets}
                    </span>
                  </p>
                </div>

                <div className="rounded-[8px] border border-[rgba(255,255,255,0.06)] bg-canvas p-4">
                  <span className="text-xs text-ink-muted">Total reps</span>
                  <p className="mt-1 text-xl font-medium text-ink-primary tabular-nums">
                    {state.totalReps}
                  </p>
                </div>

                <div className="rounded-[8px] border border-[rgba(255,255,255,0.06)] bg-canvas p-4">
                  <span className="text-xs text-ink-muted">Active time</span>
                  <p className="mt-1 text-xl font-medium text-ink-primary tabular-nums">
                    {formatTimerClock(elapsedSeconds)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Exercise-specific biomechanics */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Live biomechanics</CardTitle>
                  <span className="text-xs font-medium text-ink-muted">
                    Phase: {state.lastPhase}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2.5 pt-0">
                {exerciseDef.metricDefinitions.map((metric) => {
                  const raw = state.lastMetrics[metric.key];
                  const formatted =
                    raw === undefined
                      ? "N/A"
                      : metric.unit
                        ? `${String(raw)}${metric.unit}`
                        : String(raw);
                  return (
                    <div
                      key={metric.key}
                      className="flex items-center justify-between rounded-[8px] border border-[rgba(255,255,255,0.06)] bg-canvas px-3.5 py-2.5 text-sm"
                    >
                      <span className="text-ink-secondary">{metric.label}</span>
                      <span className="font-semibold text-ink-primary tabular-nums">
                        {formatted}
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* AI Coach panel */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Coach feedback</CardTitle>
                  {coachBanner ? (
                    <Badge variant="neutral">
                      {coachBanner.source === "groq" ? "Groq AI" : "Local cue"}
                    </Badge>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <p
                  data-testid="coach-feedback-text"
                  className="text-sm leading-6 text-ink-primary"
                >
                  {coachBanner?.text ?? exerciseDef.cameraCue}
                </p>

                {state.lastFormIssues.length > 0 ? (
                  <div className="space-y-1.5 rounded-[8px] border border-status-warning/30 bg-status-warning/10 p-3">
                    {state.lastFormIssues.map((issue) => (
                      <p key={issue} className="text-xs text-[#F5B942]">
                        {issue}
                      </p>
                    ))}
                  </div>
                ) : null}

                <p className="text-[11px] text-ink-muted">
                  Advisory technique feedback only; not medical advice.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Early-end confirmation dialog */}
      <Dialog open={confirmEndOpen} onOpenChange={setConfirmEndOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End workout session early?</DialogTitle>
            <DialogDescription>
              Your completed reps ({state.totalReps}) and active duration (
              {formatTimerClock(elapsedSeconds)}) will be saved as an interrupted
              session.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setConfirmEndOpen(false)}
            >
              Keep training
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleEndEarlyConfirmed}
              data-testid="confirm-end-workout-btn"
            >
              Save and end
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
