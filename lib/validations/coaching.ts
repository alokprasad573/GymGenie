import { z } from "zod";
import { exerciseTypeSchema } from "@/lib/validations/workout";

export const coachingEventTypeSchema = z.enum([
  "workout_started",
  "set_completed",
  "workout_completed",
  "no_pose_detected",
  "ongoing_form_check",
  "rep_completed",
]);

export const coachingRequestSchema = z.object({
  event: coachingEventTypeSchema,
  exercise: exerciseTypeSchema,
  repCount: z.number().int().min(0).max(5000).default(0),
  currentSet: z.number().int().min(1).max(50).default(1),
  targetSets: z.number().int().min(1).max(50).default(3),
  issue: z.string().trim().max(240).optional().nullable(),
  metrics: z
    .record(
      z.string().min(1).max(40),
      z.union([z.number().finite(), z.string().max(48), z.boolean()])
    )
    .refine((obj) => Object.keys(obj).length <= 10, {
      message: "metrics payload too large",
    })
    .optional(),
});

export type CoachingRequestInput = z.infer<typeof coachingRequestSchema>;
