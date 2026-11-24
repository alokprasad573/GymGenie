"use client";

import { workoutConfigSchema } from "@/lib/validations/workout";
import type { WorkoutConfig } from "@/types/exercise";

const STORAGE_KEY = "gymgenie:active_workout_config";

export const DEFAULT_WORKOUT_CONFIG: WorkoutConfig = {
  exercise: "squats",
  targetReps: 10,
  totalSets: 3,
  restDuration: 60,
  enableVoice: true,
  enableAiCoaching: true,
};

export function saveWorkoutConfig(config: WorkoutConfig): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Ignore storage quota / private mode failures
  }
}

export function loadWorkoutConfig(): WorkoutConfig {
  if (typeof window === "undefined") return DEFAULT_WORKOUT_CONFIG;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_WORKOUT_CONFIG;
    const parsed = workoutConfigSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : DEFAULT_WORKOUT_CONFIG;
  } catch {
    return DEFAULT_WORKOUT_CONFIG;
  }
}
