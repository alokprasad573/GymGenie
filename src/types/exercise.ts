export type ExerciseType =
  | "squats"
  | "pushups"
  | "biceps_curls"
  | "shoulder_press"
  | "lunges";

export type LegacyExerciseLabel =
  | "Squats"
  | "Push-ups"
  | "Biceps Curls (Dumbbell)"
  | "Shoulder Press"
  | "Lunges";

export interface PoseLandmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export type ExercisePhase = "up" | "down" | "transition" | "unknown";

export type DetectorMetricValue = number | boolean | string;

export interface SquatMetrics extends Record<string, DetectorMetricValue> {
  kneeAngle: number;
  backAngle: number;
  depthStatus: "GOOD DEPTH" | "TOO HIGH" | "STANDING" | "N/A";
}

export interface PushUpMetrics extends Record<string, DetectorMetricValue> {
  elbowAngle: number;
  bodyAlignment: "Straight" | "Slight Bend" | "Poor Form";
  hipStatus: "LEVEL" | "SAGGING" | "PIKED UP";
}

export interface BicepsCurlMetrics extends Record<string, DetectorMetricValue> {
  elbowAngle: number;
  shoulderStatus: "STABLE" | "ELBOW DRIFTING";
  swingStatus: "NO SWING" | "SWINGING";
}

export interface ShoulderPressMetrics
  extends Record<string, DetectorMetricValue> {
  elbowAngle: number;
  extensionStatus: "FULL" | "PARTIAL" | "LOW";
  backArchStatus: "GOOD" | "ARCHED";
}

export interface LungeMetrics extends Record<string, DetectorMetricValue> {
  frontKneeAngle: number;
  torsoAngle: number;
  balanceStatus: "BALANCED" | "OFF BALANCE";
}

export type ExerciseSpecificMetrics =
  | SquatMetrics
  | PushUpMetrics
  | BicepsCurlMetrics
  | ShoulderPressMetrics
  | LungeMetrics;

export interface ExerciseFrameResult<
  TMetrics extends Record<string, DetectorMetricValue> = Record<
    string,
    DetectorMetricValue
  >,
> {
  exercise: ExerciseType;
  repCount: number;
  phase: ExercisePhase;
  stage: "up" | "down" | null;
  metrics: TMetrics;
  legacyMetrics: Record<string, number | string>;
  formIssues: string[];
  repCompleted: boolean;
  landmarksValid: boolean;
}

export interface ExerciseDetector<
  TMetrics extends Record<string, DetectorMetricValue> = Record<
    string,
    DetectorMetricValue
  >,
> {
  readonly exercise: ExerciseType;
  reset(): void;
  process(landmarks: PoseLandmark[]): ExerciseFrameResult<TMetrics>;
}

export type WorkoutStatus = "COMPLETED" | "INTERRUPTED";

export interface WorkoutSetRecord {
  setNumber: number;
  reps: number;
  durationSeconds?: number;
  completedAt?: string;
}

export interface WorkoutConfig {
  exercise: ExerciseType;
  targetReps: number;
  totalSets: number;
  restDuration: number;
  enableVoice: boolean;
  enableAiCoaching: boolean;
}

export type WorkoutLifecycleState =
  | "IDLE"
  | "INITIALIZING"
  | "READY"
  | "ACTIVE"
  | "PAUSED"
  | "SET_COMPLETED"
  | "WORKOUT_COMPLETED"
  | "ERROR";

export type CoachingEventType =
  | "workout_started"
  | "set_completed"
  | "workout_completed"
  | "no_pose_detected"
  | "ongoing_form_check"
  | "rep_completed";
