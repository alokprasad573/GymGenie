import "server-only";
import { EXERCISE_ORDER, EXERCISES } from "@/config/exercises";
import {
  mongoWorkoutRepository,
  type WorkoutDTO,
  type WorkoutRepository,
} from "@/repositories/workout.repository";
import type { ExerciseType } from "@/types/exercise";

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

function toUtcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Consecutive UTC calendar days with >= 1 persisted workout, anchored on
 * today or yesterday so a streak stays alive until a full calendar day is missed.
 */
export function calculateWorkoutStreak(dates: Date[], now = new Date()): number {
  if (dates.length === 0) return 0;

  const uniqueDays = new Set<string>(dates.map(toUtcDayKey));
  const todayUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const yesterdayUtc = new Date(todayUtc.getTime() - 86_400_000);

  let cursor: Date;
  if (uniqueDays.has(toUtcDayKey(todayUtc))) {
    cursor = todayUtc;
  } else if (uniqueDays.has(toUtcDayKey(yesterdayUtc))) {
    cursor = yesterdayUtc;
  } else {
    return 0;
  }

  let streak = 0;
  while (uniqueDays.has(toUtcDayKey(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - 86_400_000);
  }
  return streak;
}

function buildDailyBuckets(
  workouts: WorkoutDTO[],
  days: number,
  now = new Date()
): DailyActivityPoint[] {
  const safeDays = Math.max(1, Math.min(365, days));
  const endUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );

  const buckets = new Map<string, DailyActivityPoint>();
  const formatter = new Intl.DateTimeFormat("en-US", {
    weekday: safeDays <= 7 ? "short" : undefined,
    month: safeDays > 7 ? "short" : undefined,
    day: safeDays > 7 ? "numeric" : undefined,
    timeZone: "UTC",
  });

  for (let i = safeDays - 1; i >= 0; i--) {
    const day = new Date(endUtc.getTime() - i * 86_400_000);
    const key = toUtcDayKey(day);
    buckets.set(key, {
      date: key,
      label: formatter.format(day),
      workouts: 0,
      reps: 0,
      durationSeconds: 0,
    });
  }

  for (const w of workouts) {
    const key = w.startedAt.slice(0, 10);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.workouts += 1;
      bucket.reps += w.totalReps;
      bucket.durationSeconds += w.durationSeconds;
    }
  }

  return Array.from(buckets.values());
}

export function createAnalyticsService(repo: WorkoutRepository) {
  return {
    async getOverview(userId: string, now = new Date()): Promise<AnalyticsOverview> {
      const from365 = new Date(now.getTime() - 365 * 86_400_000);
      const [workouts, allDates] = await Promise.all([
        repo.listForUserInRange(userId, from365, now),
        repo.listAllDatesForUser(userId, 365),
      ]);

      let totalReps = 0;
      let totalSets = 0;
      let totalDurationSeconds = 0;
      let completedWorkouts = 0;
      const exerciseCounts = new Map<ExerciseType, number>();

      for (const w of workouts) {
        totalReps += w.totalReps;
        totalSets += w.totalSets;
        totalDurationSeconds += w.durationSeconds;
        if (w.status === "COMPLETED") completedWorkouts += 1;
        exerciseCounts.set(
          w.exerciseName,
          (exerciseCounts.get(w.exerciseName) ?? 0) + 1
        );
      }

      let favoriteExercise: AnalyticsOverview["favoriteExercise"] = null;
      for (const [ex, count] of exerciseCounts.entries()) {
        if (!favoriteExercise || count > favoriteExercise.sessions) {
          favoriteExercise = {
            exercise: ex,
            label: EXERCISES[ex].shortLabel,
            sessions: count,
          };
        }
      }

      return {
        totalWorkouts: workouts.length,
        completedWorkouts,
        totalReps,
        totalSets,
        totalDurationSeconds,
        currentStreakDays: calculateWorkoutStreak(allDates, now),
        streakRule:
          "Consecutive UTC calendar days with at least one logged workout, anchored on today or yesterday.",
        favoriteExercise,
        weeklyActivity: buildDailyBuckets(workouts, 7, now),
        recentWorkouts: workouts.slice(0, 5),
      };
    },

    async getWeekly(
      userId: string,
      days = 7,
      now = new Date()
    ): Promise<{ days: number; series: DailyActivityPoint[] }> {
      const bounded = Math.max(7, Math.min(90, days));
      const from = new Date(now.getTime() - bounded * 86_400_000);
      const workouts = await repo.listForUserInRange(userId, from, now);
      return {
        days: bounded,
        series: buildDailyBuckets(workouts, bounded, now),
      };
    },

    async getMonthly(
      userId: string,
      months = 6,
      now = new Date()
    ): Promise<{ months: number; series: MonthlyActivityPoint[] }> {
      const boundedMonths = Math.max(1, Math.min(12, months));
      const startMonth = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (boundedMonths - 1), 1)
      );
      const workouts = await repo.listForUserInRange(userId, startMonth, now);

      const formatter = new Intl.DateTimeFormat("en-US", {
        month: "short",
        year: "2-digit",
        timeZone: "UTC",
      });

      const buckets = new Map<string, MonthlyActivityPoint>();
      for (let i = 0; i < boundedMonths; i++) {
        const d = new Date(
          Date.UTC(startMonth.getUTCFullYear(), startMonth.getUTCMonth() + i, 1)
        );
        const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
        buckets.set(key, {
          month: key,
          label: formatter.format(d),
          workouts: 0,
          reps: 0,
          durationSeconds: 0,
        });
      }

      for (const w of workouts) {
        const key = w.startedAt.slice(0, 7);
        const bucket = buckets.get(key);
        if (bucket) {
          bucket.workouts += 1;
          bucket.reps += w.totalReps;
          bucket.durationSeconds += w.durationSeconds;
        }
      }

      return {
        months: boundedMonths,
        series: Array.from(buckets.values()),
      };
    },

    async getExercises(
      userId: string,
      days = 90,
      now = new Date()
    ): Promise<{ days: number; exercises: ExerciseAnalyticsItem[] }> {
      const bounded = Math.max(7, Math.min(365, days));
      const from = new Date(now.getTime() - bounded * 86_400_000);
      const workouts = await repo.listForUserInRange(userId, from, now);

      const byExercise = new Map<ExerciseType, WorkoutDTO[]>();
      for (const ex of EXERCISE_ORDER) {
        byExercise.set(ex, []);
      }
      for (const w of workouts) {
        byExercise.get(w.exerciseName)?.push(w);
      }

      const items: ExerciseAnalyticsItem[] = EXERCISE_ORDER.map((ex) => {
        const list = (byExercise.get(ex) ?? []).slice().reverse(); // oldest -> newest
        let totalReps = 0;
        let totalSets = 0;
        let totalDurationSeconds = 0;
        let bestSessionReps = 0;

        for (const item of list) {
          totalReps += item.totalReps;
          totalSets += item.totalSets;
          totalDurationSeconds += item.durationSeconds;
          if (item.totalReps > bestSessionReps) {
            bestSessionReps = item.totalReps;
          }
        }

        return {
          exercise: ex,
          label: EXERCISES[ex].shortLabel,
          sessions: list.length,
          totalReps,
          totalSets,
          totalDurationSeconds,
          bestSessionReps,
          progression: list.slice(-20).map((w) => ({
            date: w.startedAt.slice(0, 10),
            reps: w.totalReps,
            durationSeconds: w.durationSeconds,
          })),
        };
      });

      return { days: bounded, exercises: items };
    },
  };
}

export const analyticsService = createAnalyticsService(mongoWorkoutRepository);
