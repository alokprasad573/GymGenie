import "server-only";
import { AppError } from "@/lib/errors";
import {
  mongoWorkoutRepository,
  type PaginatedWorkouts,
  type WorkoutDTO,
  type WorkoutRepository,
} from "@/repositories/workout.repository";
import type {
  CreateWorkoutInput,
  ListWorkoutsQuery,
  UpdateWorkoutInput,
} from "@/lib/validations/workout";

export function createWorkoutService(repo: WorkoutRepository) {
  return {
    async saveWorkout(
      userId: string,
      input: CreateWorkoutInput
    ): Promise<{ workout: WorkoutDTO; created: boolean }> {
      const started = new Date(input.startedAt);
      if (input.completedAt) {
        const completed = new Date(input.completedAt);
        if (completed.getTime() < started.getTime() - 1000) {
          throw new AppError(
            "VALIDATION_ERROR",
            "completedAt cannot be earlier than startedAt",
            400
          );
        }
      }

      if (input.sets.length > 0) {
        const setRepSum = input.sets.reduce((acc, s) => acc + s.reps, 0);
        if (input.totalReps < setRepSum) {
          throw new AppError(
            "VALIDATION_ERROR",
            "totalReps cannot be less than the sum of logged set reps",
            400
          );
        }
      }

      return repo.createIdempotent(userId, input);
    },

    async listWorkouts(
      userId: string,
      query: ListWorkoutsQuery
    ): Promise<PaginatedWorkouts> {
      return repo.listForUser(userId, query);
    },

    async getWorkout(userId: string, workoutId: string): Promise<WorkoutDTO> {
      const found = await repo.findOwnedById(userId, workoutId);
      if (!found) {
        throw new AppError("NOT_FOUND", "Workout not found", 404);
      }
      return found;
    },

    async updateWorkout(
      userId: string,
      workoutId: string,
      input: UpdateWorkoutInput
    ): Promise<WorkoutDTO> {
      const updated = await repo.updateOwnedNotes(userId, workoutId, input.notes);
      if (!updated) {
        throw new AppError("NOT_FOUND", "Workout not found", 404);
      }
      return updated;
    },

    async deleteWorkout(userId: string, workoutId: string): Promise<void> {
      const deleted = await repo.deleteOwnedById(userId, workoutId);
      if (!deleted) {
        throw new AppError("NOT_FOUND", "Workout not found", 404);
      }
    },
  };
}

export const workoutService = createWorkoutService(mongoWorkoutRepository);
