import type { ExerciseType, LegacyExerciseLabel } from "@/types/exercise";

export interface ExerciseDefinition {
  id: ExerciseType;
  label: LegacyExerciseLabel;
  shortLabel: string;
  muscleGroup: string;
  description: string;
  cameraCue: string;
  defaultSets: number;
  defaultReps: number;
  defaultRestSeconds: number;
  thresholds: {
    primaryTrigger: number;
    returnTrigger: number;
    minVisibility: number;
  };
  metricDefinitions: Array<{
    key: string;
    label: string;
    unit?: string;
  }>;
}

export const EXERCISE_ORDER: readonly ExerciseType[] = [
  "squats",
  "pushups",
  "biceps_curls",
  "shoulder_press",
  "lunges",
] as const;

export const EXERCISES: Record<ExerciseType, ExerciseDefinition> = {
  squats: {
    id: "squats",
    label: "Squats",
    shortLabel: "Squats",
    muscleGroup: "Lower body",
    description:
      "Tracks hip-knee-ankle flexion depth and torso lean from a side or three-quarter angle.",
    cameraCue: "Stand full-body in frame at a 45° side angle",
    defaultSets: 3,
    defaultReps: 10,
    defaultRestSeconds: 60,
    thresholds: {
      primaryTrigger: 100,
      returnTrigger: 160,
      minVisibility: 0.7,
    },
    metricDefinitions: [
      { key: "kneeAngle", label: "Knee angle", unit: "°" },
      { key: "backAngle", label: "Back angle", unit: "°" },
      { key: "depthStatus", label: "Depth status" },
    ],
  },
  pushups: {
    id: "pushups",
    label: "Push-ups",
    shortLabel: "Push-ups",
    muscleGroup: "Upper body & core",
    description:
      "Tracks elbow flexion along with full-body plank alignment and hip sag or piking.",
    cameraCue: "Position camera sideways at floor height showing head to ankles",
    defaultSets: 3,
    defaultReps: 12,
    defaultRestSeconds: 60,
    thresholds: {
      primaryTrigger: 90,
      returnTrigger: 160,
      minVisibility: 0.7,
    },
    metricDefinitions: [
      { key: "elbowAngle", label: "Elbow angle", unit: "°" },
      { key: "bodyAlignment", label: "Body alignment" },
      { key: "hipStatus", label: "Hip position" },
    ],
  },
  biceps_curls: {
    id: "biceps_curls",
    label: "Biceps Curls (Dumbbell)",
    shortLabel: "Biceps curls",
    muscleGroup: "Arms",
    description:
      "Measures elbow curl flexion, lateral elbow drift relative to the shoulder, and torso swing.",
    cameraCue: "Face the camera or turn slightly sideways showing hips to shoulders",
    defaultSets: 3,
    defaultReps: 12,
    defaultRestSeconds: 45,
    thresholds: {
      primaryTrigger: 50,
      returnTrigger: 160,
      minVisibility: 0.7,
    },
    metricDefinitions: [
      { key: "elbowAngle", label: "Elbow angle", unit: "°" },
      { key: "shoulderStatus", label: "Shoulder stability" },
      { key: "swingStatus", label: "Swing detection" },
    ],
  },
  shoulder_press: {
    id: "shoulder_press",
    label: "Shoulder Press",
    shortLabel: "Shoulder press",
    muscleGroup: "Shoulders",
    description:
      "Monitors overhead elbow extension and lower-back arch stability throughout each press.",
    cameraCue: "Stand facing the camera with full overhead clearance visible",
    defaultSets: 3,
    defaultReps: 10,
    defaultRestSeconds: 60,
    thresholds: {
      primaryTrigger: 90,
      returnTrigger: 150,
      minVisibility: 0.7,
    },
    metricDefinitions: [
      { key: "elbowAngle", label: "Elbow angle", unit: "°" },
      { key: "extensionStatus", label: "Arm extension" },
      { key: "backArchStatus", label: "Back arch" },
    ],
  },
  lunges: {
    id: "lunges",
    label: "Lunges",
    shortLabel: "Lunges",
    muscleGroup: "Lower body & balance",
    description:
      "Automatically tracks the leading knee angle, upright torso posture, and lateral balance.",
    cameraCue: "Keep full body in frame with room to step forward",
    defaultSets: 3,
    defaultReps: 10,
    defaultRestSeconds: 60,
    thresholds: {
      primaryTrigger: 100,
      returnTrigger: 160,
      minVisibility: 0.7,
    },
    metricDefinitions: [
      { key: "frontKneeAngle", label: "Front knee angle", unit: "°" },
      { key: "torsoAngle", label: "Torso angle", unit: "°" },
      { key: "balanceStatus", label: "Balance status" },
    ],
  },
};

export const LEGACY_LABEL_TO_EXERCISE: Record<LegacyExerciseLabel, ExerciseType> = {
  Squats: "squats",
  "Push-ups": "pushups",
  "Biceps Curls (Dumbbell)": "biceps_curls",
  "Shoulder Press": "shoulder_press",
  Lunges: "lunges",
};

/** Exact 18 MediaPipe pose bone connections preserved from services/config/workout_config.py */
export const POSE_CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [24, 26],
  [25, 27],
  [26, 28],
  [27, 29],
  [28, 30],
  [29, 31],
  [30, 32],
  [27, 31],
  [28, 32],
];

export const MEDIAPIPE_CONFIG = {
  modelAssetPath: "/models/pose_landmarker_full.task",
  wasmBasePath:
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm",
  minPoseDetectionConfidence: 0.7,
  minPosePresenceConfidence: 0.7,
  minTrackingConfidence: 0.7,
  landmarkVisibilityThreshold: 0.7,
} as const;

export function isExerciseType(value: string): value is ExerciseType {
  return value in EXERCISES;
}

export function getExerciseDefinition(type: ExerciseType): ExerciseDefinition {
  return EXERCISES[type];
}
