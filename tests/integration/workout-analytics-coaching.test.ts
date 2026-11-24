// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createWorkoutService } from "@/services/workout/workout.service";
import {
  calculateWorkoutStreak,
  createAnalyticsService,
} from "@/services/analytics/analytics.service";
import {
  createCoachingService,
  sanitizeCoachingText,
} from "@/services/coaching/groq-coaching.service";
import { createInMemoryTestRepositories } from "../helpers/in-memory-repos";

describe("Phase 8, 9 & 11 — Workouts, Analytics & Groq Coaching Integration", () => {
  describe("Workout persistence validation & ownership", () => {
    it("rejects inverted timestamps and inconsistent set totals", async () => {
      const repos = createInMemoryTestRepositories();
      const service = createWorkoutService(repos.workoutRepo);

      await expect(
        service.saveWorkout("user-1", {
          idempotencyKey: "key-invalid-time",
          exerciseName: "pushups",
          status: "COMPLETED",
          targetReps: 10,
          targetSets: 2,
          totalReps: 20,
          totalSets: 2,
          durationSeconds: 100,
          startedAt: "2026-11-23T12:05:00.000Z",
          completedAt: "2026-11-23T12:00:00.000Z",
          sets: [],
        })
      ).rejects.toMatchObject({ statusCode: 400, code: "VALIDATION_ERROR" });

      await expect(
        service.saveWorkout("user-1", {
          idempotencyKey: "key-invalid-reps",
          exerciseName: "pushups",
          status: "COMPLETED",
          targetReps: 10,
          targetSets: 2,
          totalReps: 5,
          totalSets: 2,
          durationSeconds: 100,
          startedAt: "2026-11-23T12:00:00.000Z",
          sets: [{ setNumber: 1, reps: 10 }],
        })
      ).rejects.toMatchObject({ statusCode: 400, code: "VALIDATION_ERROR" });
    });

    it("supports full CRUD scoped strictly to the authenticated owner", async () => {
      const repos = createInMemoryTestRepositories();
      const service = createWorkoutService(repos.workoutRepo);

      const { workout } = await service.saveWorkout("owner-1", {
        idempotencyKey: "key-crud-1234",
        exerciseName: "lunges",
        status: "INTERRUPTED",
        targetReps: 10,
        targetSets: 3,
        totalReps: 14,
        totalSets: 1,
        durationSeconds: 95,
        startedAt: "2026-11-23T12:00:00.000Z",
        sets: [
          { setNumber: 1, reps: 10 },
          { setNumber: 2, reps: 4 },
        ],
      });

      const updated = await service.updateWorkout("owner-1", workout.id, {
        notes: "Felt strong on front leg depth",
      });
      expect(updated.notes).toBe("Felt strong on front leg depth");

      await expect(
        service.getWorkout("other-user", workout.id)
      ).rejects.toMatchObject({ statusCode: 404 });

      await service.deleteWorkout("owner-1", workout.id);
      await expect(
        service.getWorkout("owner-1", workout.id)
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe("Analytics & streak calculation", () => {
    it("computes consecutive UTC day streaks accurately", () => {
      const now = new Date("2026-11-23T18:00:00Z");
      const dates = [
        new Date("2026-11-23T10:00:00Z"),
        new Date("2026-11-23T16:00:00Z"), // duplicate day
        new Date("2026-11-22T09:00:00Z"),
        new Date("2026-11-21T20:00:00Z"),
        new Date("2026-11-19T12:00:00Z"), // gap on Nov 20
      ];
      expect(calculateWorkoutStreak(dates, now)).toBe(3);

      // Yesterday anchor keeps streak alive
      const yesterdayOnly = [
        new Date("2026-11-22T12:00:00Z"),
        new Date("2026-11-21T12:00:00Z"),
      ];
      expect(calculateWorkoutStreak(yesterdayOnly, now)).toBe(2);

      // Two days ago breaks streak
      expect(
        calculateWorkoutStreak([new Date("2026-11-21T12:00:00Z")], now)
      ).toBe(0);
    });

    it("aggregates overview, weekly, monthly, and per-exercise metrics strictly for one user", async () => {
      const repos = createInMemoryTestRepositories();
      const workoutSvc = createWorkoutService(repos.workoutRepo);
      const analyticsSvc = createAnalyticsService(repos.workoutRepo);

      const now = new Date("2026-11-23T18:00:00Z");

      await workoutSvc.saveWorkout("athlete-1", {
        idempotencyKey: "wk-1-aaaaaaaa",
        exerciseName: "squats",
        status: "COMPLETED",
        targetReps: 10,
        targetSets: 3,
        totalReps: 30,
        totalSets: 3,
        durationSeconds: 210,
        startedAt: "2026-11-23T10:00:00.000Z",
        sets: [],
      });
      await workoutSvc.saveWorkout("athlete-1", {
        idempotencyKey: "wk-2-bbbbbbbb",
        exerciseName: "squats",
        status: "COMPLETED",
        targetReps: 12,
        targetSets: 3,
        totalReps: 36,
        totalSets: 3,
        durationSeconds: 240,
        startedAt: "2026-11-22T10:00:00.000Z",
        sets: [],
      });
      // Another user's data must not bleed into athlete-1 analytics
      await workoutSvc.saveWorkout("athlete-2", {
        idempotencyKey: "wk-3-cccccccc",
        exerciseName: "pushups",
        status: "COMPLETED",
        targetReps: 20,
        targetSets: 5,
        totalReps: 100,
        totalSets: 5,
        durationSeconds: 500,
        startedAt: "2026-11-23T11:00:00.000Z",
        sets: [],
      });

      const overview = await analyticsSvc.getOverview("athlete-1", now);
      expect(overview.totalWorkouts).toBe(2);
      expect(overview.totalReps).toBe(66);
      expect(overview.totalSets).toBe(6);
      expect(overview.totalDurationSeconds).toBe(450);
      expect(overview.currentStreakDays).toBe(2);
      expect(overview.favoriteExercise?.exercise).toBe("squats");

      const weekly = await analyticsSvc.getWeekly("athlete-1", 7, now);
      expect(weekly.series).toHaveLength(7);

      const exercises = await analyticsSvc.getExercises("athlete-1", 30, now);
      const squatRow = exercises.exercises.find((e) => e.exercise === "squats");
      expect(squatRow?.bestSessionReps).toBe(36);
      expect(squatRow?.sessions).toBe(2);
    });
  });

  describe("Groq AI coaching resilience, cooldowns, and safety", () => {
    it("returns sanitized Groq feedback on success and enforces 5s cooldown on form checks", async () => {
      const service = createCoachingService({
        client: {
          async complete() {
            return '  "Drop your hips slightly lower and keep your chest tall."  ';
          },
        },
        cooldownMs: 5_000,
      });

      const first = await service.generateFeedback(
        "user-1",
        {
          event: "ongoing_form_check",
          exercise: "squats",
          repCount: 4,
          currentSet: 1,
          targetSets: 3,
          issue: "Squat is not deep enough",
        },
        10_000
      );
      expect(first.source).toBe("groq");
      expect(first.throttled).toBe(false);
      expect(first.feedback).toBe(
        "Drop your hips slightly lower and keep your chest tall."
      );

      // Within 5s cooldown -> throttled
      const throttled = await service.generateFeedback(
        "user-1",
        {
          event: "ongoing_form_check",
          exercise: "squats",
          repCount: 5,
          currentSet: 1,
          targetSets: 3,
          issue: "Squat is not deep enough",
        },
        12_000
      );
      expect(throttled.throttled).toBe(true);

      // Major event bypasses cooldown
      const major = await service.generateFeedback(
        "user-1",
        {
          event: "set_completed",
          exercise: "squats",
          repCount: 10,
          currentSet: 1,
          targetSets: 3,
        },
        12_500
      );
      expect(major.throttled).toBe(false);
      expect(major.source).toBe("groq");
    });

    it("falls back safely on provider failure, timeout, or unsafe medical text", async () => {
      const failingService = createCoachingService({
        client: {
          async complete() {
            throw new Error("Groq 503 Service Unavailable");
          },
        },
      });

      const res1 = await failingService.generateFeedback(
        "user-2",
        {
          event: "workout_started",
          exercise: "pushups",
          repCount: 0,
          currentSet: 1,
          targetSets: 3,
        },
        20_000
      );
      expect(res1.source).toBe("fallback");
      expect(res1.feedback.length).toBeGreaterThan(10);

      // Timeout simulation
      const slowService = createCoachingService({
        client: {
          complete({ signal }) {
            return new Promise((_resolve, reject) => {
              signal.addEventListener("abort", () =>
                reject(new Error("Aborted due to timeout"))
              );
            });
          },
        },
        timeoutMs: 30,
      });

      const res2 = await slowService.generateFeedback(
        "user-3",
        {
          event: "set_completed",
          exercise: "biceps_curls",
          repCount: 12,
          currentSet: 1,
          targetSets: 3,
        },
        30_000
      );
      expect(res2.source).toBe("fallback");
      expect(res2.feedback).toContain("Set 1 complete");

      // Medical diagnosis text rejected by sanitizer
      expect(
        sanitizeCoachingText("You probably have a torn ACL or herniated disc.")
      ).toBeNull();
    });

    it("falls back to secondary model when primary model fails", async () => {
      const calls: string[] = [];
      const multiModelService = createCoachingService({
        model: "openai/gpt-oss-120b",
        fallbackModel: "openai/gpt-oss-20b",
        client: {
          async complete({ model }) {
            calls.push(model);
            if (model === "openai/gpt-oss-120b") {
              throw new Error("120b overloaded or rate limited");
            }
            return "Keep your elbows close to your torso.";
          },
        },
      });

      const res = await multiModelService.generateFeedback(
        "user-4",
        {
          event: "ongoing_form_check",
          exercise: "biceps_curls",
          repCount: 5,
          currentSet: 1,
          targetSets: 3,
          issue: "Elbows flaring",
        },
        40_000
      );

      expect(calls).toEqual(["openai/gpt-oss-120b", "openai/gpt-oss-20b"]);
      expect(res.source).toBe("groq");
      expect(res.modelUsed).toBe("openai/gpt-oss-20b");
      expect(res.feedback).toBe("Keep your elbows close to your torso.");
    });
  });
});
