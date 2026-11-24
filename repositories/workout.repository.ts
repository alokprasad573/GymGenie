import "server-only";
import { Types, type FilterQuery } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { WorkoutModel, type IWorkout } from "@/models/Workout";
import type { ExerciseType, WorkoutSetRecord, WorkoutStatus } from "@/types/exercise";
import type { CreateWorkoutInput, ListWorkoutsQuery } from "@/lib/validations/workout";
import { getMemoryStore } from "@/repositories/memory-store";

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

export function toWorkoutDTO(doc: IWorkout): WorkoutDTO {
  return {
    id: doc._id.toString(),
    userId: doc.userId.toString(),
    idempotencyKey: doc.idempotencyKey,
    exerciseName: doc.exerciseName,
    status: doc.status,
    targetReps: doc.targetReps,
    targetSets: doc.targetSets,
    totalReps: doc.totalReps,
    totalSets: doc.totalSets,
    durationSeconds: doc.durationSeconds,
    startedAt: doc.startedAt.toISOString(),
    ...(doc.completedAt ? { completedAt: doc.completedAt.toISOString() } : {}),
    sets: (doc.sets ?? []).map((s) => ({
      setNumber: s.setNumber,
      reps: s.reps,
      ...(s.durationSeconds !== undefined
        ? { durationSeconds: s.durationSeconds }
        : {}),
      ...(s.completedAt ? { completedAt: s.completedAt.toISOString() } : {}),
    })),
    ...(doc.exerciseMetrics ? { exerciseMetrics: doc.exerciseMetrics } : {}),
    ...(doc.notes ? { notes: doc.notes } : {}),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export interface WorkoutRepository {
  createIdempotent(
    userId: string,
    input: CreateWorkoutInput
  ): Promise<{ workout: WorkoutDTO; created: boolean }>;
  listForUser(userId: string, query: ListWorkoutsQuery): Promise<PaginatedWorkouts>;
  findOwnedById(userId: string, workoutId: string): Promise<WorkoutDTO | null>;
  updateOwnedNotes(
    userId: string,
    workoutId: string,
    notes: string | undefined
  ): Promise<WorkoutDTO | null>;
  deleteOwnedById(userId: string, workoutId: string): Promise<boolean>;
  listForUserInRange(
    userId: string,
    from: Date,
    to: Date
  ): Promise<WorkoutDTO[]>;
  listAllDatesForUser(userId: string, limit?: number): Promise<Date[]>;
}

export const mongoWorkoutRepository: WorkoutRepository = {
  async createIdempotent(userId, input) {
    const db = await connectToDatabase();
    if (!db) return getMemoryStore().workoutRepo.createIdempotent(userId, input);
    const userObjectId = new Types.ObjectId(userId);

    const existing = await WorkoutModel.findOne({
      userId: userObjectId,
      idempotencyKey: input.idempotencyKey,
    })
      .lean<IWorkout>()
      .exec();

    if (existing) {
      return { workout: toWorkoutDTO(existing), created: false };
    }

    try {
      const created = await WorkoutModel.create({
        userId: userObjectId,
        idempotencyKey: input.idempotencyKey,
        exerciseName: input.exerciseName,
        status: input.status,
        targetReps: input.targetReps,
        targetSets: input.targetSets,
        totalReps: input.totalReps,
        totalSets: input.totalSets,
        durationSeconds: input.durationSeconds,
        startedAt: new Date(input.startedAt),
        completedAt: input.completedAt ? new Date(input.completedAt) : undefined,
        sets: input.sets.map((s) => ({
          setNumber: s.setNumber,
          reps: s.reps,
          durationSeconds: s.durationSeconds,
          completedAt: s.completedAt ? new Date(s.completedAt) : undefined,
        })),
        exerciseMetrics: input.exerciseMetrics,
        notes: input.notes,
      });

      return { workout: toWorkoutDTO(created), created: true };
    } catch (err: unknown) {
      // Handle race condition where two concurrent retries send the same idempotencyKey
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code?: unknown }).code === 11000
      ) {
        const raced = await WorkoutModel.findOne({
          userId: userObjectId,
          idempotencyKey: input.idempotencyKey,
        })
          .lean<IWorkout>()
          .exec();
        if (raced) {
          return { workout: toWorkoutDTO(raced), created: false };
        }
      }
      throw err;
    }
  },

  async listForUser(userId, query) {
    const db = await connectToDatabase();
    if (!db) return getMemoryStore().workoutRepo.listForUser(userId, query);
    if (!Types.ObjectId.isValid(userId)) {
      return { items: [], total: 0, page: query.page, limit: query.limit, totalPages: 0 };
    }
    await connectToDatabase();
    const filter: FilterQuery<IWorkout> = {
      userId: new Types.ObjectId(userId),
    };

    if (query.exercise) {
      filter.exerciseName = query.exercise;
    }
    if (query.status) {
      filter.status = query.status;
    }
    if (query.from || query.to) {
      filter.startedAt = {};
      if (query.from) filter.startedAt.$gte = new Date(query.from);
      if (query.to) filter.startedAt.$lte = new Date(query.to);
    }

    const skip = (query.page - 1) * query.limit;
    const [docs, total] = await Promise.all([
      WorkoutModel.find(filter)
        .sort({ startedAt: -1 })
        .skip(skip)
        .limit(query.limit)
        .lean<IWorkout[]>()
        .exec(),
      WorkoutModel.countDocuments(filter).exec(),
    ]);

    return {
      items: docs.map(toWorkoutDTO),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  },

  async findOwnedById(userId, workoutId) {
    const db = await connectToDatabase();
    if (!db) return getMemoryStore().workoutRepo.findOwnedById(userId, workoutId);
    if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(workoutId)) {
      return null;
    }
    const doc = await WorkoutModel.findOne({
      _id: new Types.ObjectId(workoutId),
      userId: new Types.ObjectId(userId),
    })
      .lean<IWorkout>()
      .exec();
    return doc ? toWorkoutDTO(doc) : null;
  },

  async updateOwnedNotes(userId, workoutId, notes) {
    const db = await connectToDatabase();
    if (!db) return getMemoryStore().workoutRepo.updateOwnedNotes(userId, workoutId, notes);
    if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(workoutId)) {
      return null;
    }
    const updated = await WorkoutModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(workoutId),
        userId: new Types.ObjectId(userId),
      },
      { $set: { notes: notes ?? "" } },
      { new: true, runValidators: true }
    )
      .lean<IWorkout>()
      .exec();
    return updated ? toWorkoutDTO(updated) : null;
  },

  async deleteOwnedById(userId, workoutId) {
    const db = await connectToDatabase();
    if (!db) return getMemoryStore().workoutRepo.deleteOwnedById(userId, workoutId);
    if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(workoutId)) {
      return false;
    }
    const result = await WorkoutModel.deleteOne({
      _id: new Types.ObjectId(workoutId),
      userId: new Types.ObjectId(userId),
    }).exec();
    return result.deletedCount > 0;
  },

  async listForUserInRange(userId, from, to) {
    const db = await connectToDatabase();
    if (!db) return getMemoryStore().workoutRepo.listForUserInRange(userId, from, to);
    if (!Types.ObjectId.isValid(userId)) return [];
    const docs = await WorkoutModel.find({
      userId: new Types.ObjectId(userId),
      startedAt: { $gte: from, $lte: to },
    })
      .sort({ startedAt: -1 })
      .limit(1000)
      .lean<IWorkout[]>()
      .exec();
    return docs.map(toWorkoutDTO);
  },

  async listAllDatesForUser(userId, limit = 365) {
    const db = await connectToDatabase();
    if (!db) return getMemoryStore().workoutRepo.listAllDatesForUser(userId, limit);
    if (!Types.ObjectId.isValid(userId)) return [];
    const docs = await WorkoutModel.find({
      userId: new Types.ObjectId(userId),
    })
      .select("startedAt")
      .sort({ startedAt: -1 })
      .limit(limit)
      .lean<Array<{ startedAt: Date }>>()
      .exec();
    return docs.map((d) => d.startedAt);
  },
};
