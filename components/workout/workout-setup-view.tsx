"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Camera, CameraOff, Play, RefreshCw } from "lucide-react";
import { PageChoreography } from "@/components/animations/page-choreography";
import { ExerciseRigPreview } from "@/components/three/exercise-rig-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { EXERCISE_ORDER, EXERCISES } from "@/config/exercises";
import {
  acquireCameraStream,
  enumerateVideoDevices,
  mapCameraError,
  stopMediaStream,
  type CameraErrorInfo,
  type VideoDeviceOption,
} from "@/features/exercise/camera-controller";
import {
  loadWorkoutConfig,
  saveWorkoutConfig,
} from "@/features/workout/workout-config-store";
import { workoutConfigSchema } from "@/lib/validations/workout";
import { cn } from "@/lib/utils";
import type { ExerciseType, WorkoutConfig } from "@/types/exercise";
import type { UserPreferences } from "@/types/dto";

interface WorkoutSetupViewProps {
  initialPreferences: UserPreferences;
}

export function WorkoutSetupView({ initialPreferences }: WorkoutSetupViewProps) {
  const router = useRouter();
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  const [config, setConfig] = React.useState<WorkoutConfig>(() => {
    const saved = loadWorkoutConfig();
    return {
      ...saved,
      enableVoice: initialPreferences.enableVoice,
      enableAiCoaching: initialPreferences.enableAiCoaching,
      restDuration: initialPreferences.defaultRestSeconds,
    };
  });

  const [validationError, setValidationError] = React.useState<string | null>(null);
  const [previewActive, setPreviewActive] = React.useState(false);
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [cameraError, setCameraError] = React.useState<CameraErrorInfo | null>(null);
  const [devices, setDevices] = React.useState<VideoDeviceOption[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = React.useState<string>("");

  const stopPreview = React.useCallback(() => {
    stopMediaStream(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setPreviewActive(false);
  }, []);

  const startPreview = React.useCallback(
    async (deviceId?: string) => {
      stopPreview();
      setPreviewLoading(true);
      setCameraError(null);

      try {
        const stream = await acquireCameraStream(deviceId || undefined);
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setPreviewActive(true);
        const list = await enumerateVideoDevices();
        setDevices(list);
        if (!deviceId && list[0]) {
          setSelectedDeviceId(list[0].deviceId);
        }
      } catch (err) {
        setCameraError(mapCameraError(err));
      } finally {
        setPreviewLoading(false);
      }
    },
    [stopPreview]
  );

  React.useEffect(() => {
    return () => {
      stopMediaStream(streamRef.current);
      streamRef.current = null;
    };
  }, []);

  const selectedExercise = EXERCISES[config.exercise];

  function handleSelectExercise(exercise: ExerciseType) {
    const def = EXERCISES[exercise];
    setConfig((prev) => ({
      ...prev,
      exercise,
      targetReps: def.defaultReps,
      totalSets: def.defaultSets,
    }));
  }

  function handleStartWorkout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);
    const parsed = workoutConfigSchema.safeParse(config);
    if (!parsed.success) {
      setValidationError(
        parsed.error.issues[0]?.message ?? "Invalid workout configuration"
      );
      return;
    }
    stopPreview();
    saveWorkoutConfig(parsed.data);
    const params = new URLSearchParams();
    if (selectedDeviceId) params.set("deviceId", selectedDeviceId);
    const query = params.toString();
    router.push(query ? `/workout/session?${query}` : "/workout/session");
  }

  return (
    <PageChoreography>
      <form onSubmit={handleStartWorkout} className="space-y-4">
        {/* BentoGraph Header Cell */}
        <div className="bento-cell  flex flex-wrap items-end justify-between gap-4 p-5 sm:p-6">
          <div>
            <h1 className="mt-1 text-2xl font-medium tracking-[-0.025em] text-ink-primary sm:text-[30px]">
              Workout setup
            </h1>
            <p className="mt-1 text-sm text-ink-secondary">
              Select an exercise, set rep targets, and check camera framing before starting
            </p>
          </div>
          <Button
            type="submit"
            size="lg"
            variant="primary"
            className="w-full sm:w-auto"
          >
            <Play className="h-4 w-4" strokeWidth={1.75} />
            Launch live session
          </Button>
        </div>

        {validationError ? (
          <div
            role="alert"
            className="rounded-[12px] border border-status-danger/35 bg-[#2B1517]/70 px-4 py-3 text-sm text-[#FCA5A5]"
          >
            {validationError}
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-12">
          {/* Left Bento Column (7 cols): Exercise selection + targets */}
          <div className="space-y-4 lg:col-span-7">
            <Card>
              <CardHeader className="flex-row flex-wrap items-start justify-between gap-2 space-y-0">
                <div>
                  <CardTitle>Choose exercise</CardTitle>
                  <CardDescription>
                    All five biomechanics detectors run locally in your browser.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 pt-2 sm:grid-cols-2">
                {EXERCISE_ORDER.map((id, idx) => {
                  const ex = EXERCISES[id];
                  const selected = config.exercise === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      suppressHydrationWarning
                      onClick={() => handleSelectExercise(id)}
                      aria-pressed={selected}
                      className={cn(
                        "flex cursor-pointer flex-col items-start justify-between gap-2.5 rounded-[12px] border p-4 text-left transition-colors duration-150",
                        idx === 4 && "sm:col-span-2",
                        selected
                          ? "border-accent/50 bg-elevated shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                          : "border-[rgba(255,255,255,0.07)] bg-canvas hover:border-[rgba(255,255,255,0.16)] hover:bg-surface"
                      )}
                    >
                      <div className="flex w-full flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-medium text-ink-primary">
                          {ex.label}
                        </span>
                        {selected ? (
                          <Badge variant="accent">Selected</Badge>
                        ) : (
                          <span className=" text-[11px] text-ink-muted tabular-nums">
                            {ex.thresholds.primaryTrigger}°/{ex.thresholds.returnTrigger}°
                          </span>
                        )}
                      </div>
                      <p className="text-xs leading-5 text-ink-secondary">
                        {ex.description}
                      </p>
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle>Session targets and coaching</CardTitle>
                  <span className="rounded-[6px] border border-[rgba(255,255,255,0.08)] bg-canvas px-2 py-0.5  text-[11px] text-accent tabular-nums">
                    {selectedExercise.thresholds.primaryTrigger}° /{" "}
                    {selectedExercise.thresholds.returnTrigger}°
                  </span>
                </div>
                <CardDescription>
                  Thresholds for {selectedExercise.label}: trigger{" "}
                  {selectedExercise.thresholds.primaryTrigger}° · return{" "}
                  {selectedExercise.thresholds.returnTrigger}°
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="bento-well space-y-1.5 p-3">
                    <Label htmlFor="totalSets">Sets (1–50)</Label>
                    <Input
                      id="totalSets"
                      type="number"
                      min={1}
                      max={50}
                      value={config.totalSets}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          totalSets: Number.parseInt(e.target.value, 10) || 1,
                        }))
                      }
                      className=" tabular-nums"
                    />
                  </div>

                  <div className="bento-well space-y-1.5 p-3">
                    <Label htmlFor="targetReps">Reps per set (1–100)</Label>
                    <Input
                      id="targetReps"
                      type="number"
                      min={1}
                      max={100}
                      value={config.targetReps}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          targetReps: Number.parseInt(e.target.value, 10) || 1,
                        }))
                      }
                      className=" tabular-nums"
                    />
                  </div>

                  <div className="bento-well space-y-1.5 p-3">
                    <Label htmlFor="restDuration">Rest seconds (0–600)</Label>
                    <Input
                      id="restDuration"
                      type="number"
                      min={0}
                      max={600}
                      step={5}
                      value={config.restDuration}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          restDuration: Math.max(
                            0,
                            Number.parseInt(e.target.value, 10) || 0
                          ),
                        }))
                      }
                      className=" tabular-nums"
                    />
                  </div>
                </div>

                <div className="space-y-2.5 border-t border-[rgba(255,255,255,0.06)] pt-4">
                  <div className="bento-well flex items-center justify-between gap-4 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-ink-primary">
                        Voice feedback
                      </p>
                      <p className="text-xs text-ink-secondary">
                        Speak rep completions, set transitions, and form cues using
                        browser speech synthesis
                      </p>
                    </div>
                    <Switch
                      aria-label="Enable voice feedback"
                      checked={config.enableVoice}
                      onCheckedChange={(checked) =>
                        setConfig((prev) => ({ ...prev, enableVoice: checked }))
                      }
                    />
                  </div>

                  <div className="bento-well flex items-center justify-between gap-4 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-ink-primary">
                        AI coaching cues
                      </p>
                      <p className="text-xs text-ink-secondary">
                        Generate concise event-driven form advice via server-side
                        Groq inference with safe fallback
                      </p>
                    </div>
                    <Switch
                      aria-label="Enable AI coaching"
                      checked={config.enableAiCoaching}
                      onCheckedChange={(checked) =>
                        setConfig((prev) => ({
                          ...prev,
                          enableAiCoaching: checked,
                        }))
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Bento Column (5 cols): Camera preview + 3D Rig + Metrics */}
          <div className="space-y-4 lg:col-span-5">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle>Camera preview</CardTitle>
                  {previewActive ? (
                    <Badge variant="accent" liveDot>
                      Camera ready
                    </Badge>
                  ) : (
                    <Badge variant="neutral">Standby</Badge>
                  )}
                </div>
                <CardDescription>{selectedExercise.cameraCue}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bento-well  relative aspect-video w-full overflow-hidden">
                  <video
                    ref={videoRef}
                    muted
                    playsInline
                    className={cn(
                      "h-full w-full scale-x-[-1] object-cover",
                      !previewActive && "hidden"
                    )}
                  />

                  {!previewActive ? (
                    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[rgba(255,255,255,0.09)] bg-surface">
                        <Camera
                          className="h-5 w-5 text-ink-muted"
                          strokeWidth={1.5}
                        />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-ink-primary">
                          Test framing before starting
                        </p>
                        <p className="text-xs text-ink-secondary">
                          Video stays strictly in your browser and is never recorded
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>

                {cameraError ? (
                  <div
                    role="alert"
                    className="rounded-[10px] border border-status-danger/35 bg-[#2B1517]/70 p-3 text-xs text-[#FCA5A5]"
                  >
                    <p className="font-medium">{cameraError.title}</p>
                    <p className="mt-1 text-ink-secondary">
                      {cameraError.guidance}
                    </p>
                  </div>
                ) : null}

                {devices.length > 1 ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="cameraSelect">Camera device</Label>
                    <Select
                      value={selectedDeviceId}
                      onValueChange={(value) => {
                        setSelectedDeviceId(value);
                        if (previewActive) {
                          void startPreview(value);
                        }
                      }}
                    >
                      <SelectTrigger id="cameraSelect">
                        <SelectValue placeholder="Choose camera" />
                      </SelectTrigger>
                      <SelectContent>
                        {devices.map((device) => (
                          <SelectItem
                            key={device.deviceId}
                            value={device.deviceId}
                          >
                            {device.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                <div className="flex items-center gap-2">
                  {previewActive ? (
                    <>
                      <Button
                        type="button"
                        variant="secondary"
                        className="flex-1"
                        onClick={stopPreview}
                      >
                        <CameraOff className="h-4 w-4" strokeWidth={1.5} />
                        Stop preview
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label="Restart preview"
                        onClick={() => void startPreview(selectedDeviceId)}
                      >
                        <RefreshCw className="h-4 w-4" strokeWidth={1.5} />
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full"
                      disabled={previewLoading}
                      onClick={() => void startPreview(selectedDeviceId)}
                    >
                      <Camera className="h-4 w-4" strokeWidth={1.5} />
                      {previewLoading ? "Starting camera..." : "Preview camera"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-sm">Form reference rig</CardTitle>
                  <span className=" text-xs font-medium text-accent tabular-nums">
                    {selectedExercise.thresholds.primaryTrigger}° /{" "}
                    {selectedExercise.thresholds.returnTrigger}°
                  </span>
                </div>
                <CardDescription>
                  Key joints highlighted for{" "}
                  {selectedExercise.shortLabel.toLowerCase()}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="bento-well  h-[180px] w-full overflow-hidden">
                  <ExerciseRigPreview
                    exercise={config.exercise}
                    compact
                    className="bg-transparent"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Tracked metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {selectedExercise.metricDefinitions.map((metric) => (
                  <div
                    key={metric.key}
                    className="bento-well flex items-center justify-between px-3.5 py-2.5 text-sm"
                  >
                    <span className="text-ink-secondary">{metric.label}</span>
                    <span className=" text-xs font-medium text-ink-muted">
                      {metric.unit ? `Degrees (${metric.unit})` : "Live status"}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </PageChoreography>
  );
}
