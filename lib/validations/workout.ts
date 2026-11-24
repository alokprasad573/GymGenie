import { z } from "zod";

export const exerciseTypeSchema = z.enum([
  "squats",
  "pushups",
  "biceps_curls",
  "shoulder_press",
  "lunges",
]);

export const workoutStatusSchema = z.enum(["COMPLETED", "INTERRUPTED"]);

export const workoutConfigSchema = z.object({
  exercise: exerciseTypeSchema,
  targetReps: z.number().int().min(1, "Target reps must be at least 1").max(100),
  totalSets: z.number().int().min(1, "Total sets must be at least 1").max(50),
  restDuration: z.number().int().min(0).max(600),
  enableVoice: z.boolean(),
  enableAiCoaching: z.boolean(),
});

const boundedMetricPrimitive = z.union([
  z.number().finite().min(-10000).max(10000),
  z.boolean(),
  z.string().max(64),
]);

export const exerciseMetricsSchema = z
  .record(z.string().min(1).max(40), boundedMetricPrimitive)
  .refine((obj) => Object.keys(obj).length <= 16, {
    message: "exerciseMetrics cannot exceed 16 keys",
  });

export const workoutSetSchema = z.object({
  setNumber: z.number().int().min(1).max(50),
  reps: z.number().int().min(0).max(500),
  durationSeconds: z.number().int().min(0).max(28800).optional(),
  completedAt: z.string().datetime().optional(),
});

export const createWorkoutSchema = z.object({
  idempotencyKey: z.string().trim().min(8).max(128),
  exerciseName: exerciseTypeSchema,
  status: workoutStatusSchema,
  targetReps: z.number().int().min(1).max(100),
  targetSets: z.number().int().min(1).max(50),
  totalReps: z.number().int().min(0).max(5000),
  totalSets: z.number().int().min(0).max(50),
  durationSeconds: z.number().int().min(0).max(28800),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  sets: z.array(workoutSetSchema).max(50).default([]),
  exerciseMetrics: exerciseMetricsSchema.optional(),
  notes: z.string().trim().max(500).optional(),
});

export const updateWorkoutSchema = z
  .object({
    notes: z.string().trim().max(500).optional(),
  })
  .strict();

export const listWorkoutsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  exercise: exerciseTypeSchema.optional(),
  status: workoutStatusSchema.optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const analyticsRangeSchema = z.object({
  days: z.coerce.number().int().min(7).max(365).default(30),
});

export type CreateWorkoutInput = z.infer<typeof createWorkoutSchema>;
export type UpdateWorkoutInput = z.infer<typeof updateWorkoutSchema>;
export type ListWorkoutsQuery = z.infer<typeof listWorkoutsQuerySchema>;
