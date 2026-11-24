import type { ExerciseType, WorkoutSetRecord, WorkoutStatus } from "@/types/exercise";

export type UserRole = "USER" | "ADMIN";

export interface UserPreferences {
  enableVoice: boolean;
  enableAiCoaching: boolean;
  defaultRestSeconds: number;
}

export interface PublicUser {
  id: string;
  username: string;
  displayUsername: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  role: UserRole;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutDTO {
  id: string;
  userId: string;
  idempotencyKey: string;
  exerciseName: ExerciseType;
  status: WorkoutStatus;
  targetReps: number;
  targetSets: number;
  totalReps: number;
  totalSets: number;
  durationSeconds: number;
  startedAt: string;
  completedAt?: string;
  sets: WorkoutSetRecord[];
  exerciseMetrics?: Record<string, number | boolean | string>;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedWorkouts {
  items: WorkoutDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DailyActivityPoint {
  date: string;
  label: string;
  workouts: number;
  reps: number;
  durationSeconds: number;
}

export interface MonthlyActivityPoint {
  month: string;
  label: string;
  workouts: number;
  reps: number;
  durationSeconds: number;
}

export interface ExerciseAnalyticsItem {
  exercise: ExerciseType;
  label: string;
  sessions: number;
  totalReps: number;
  totalSets: number;
  totalDurationSeconds: number;
  bestSessionReps: number;
  progression: Array<{
    date: string;
    reps: number;
    durationSeconds: number;
  }>;
}

export interface AnalyticsOverview {
  totalWorkouts: number;
  completedWorkouts: number;
  totalReps: number;
  totalSets: number;
  totalDurationSeconds: number;
  currentStreakDays: number;
  streakRule: string;
  favoriteExercise: {
    exercise: ExerciseType;
    label: string;
    sessions: number;
  } | null;
  weeklyActivity: DailyActivityPoint[];
  recentWorkouts: WorkoutDTO[];
}
