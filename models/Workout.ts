import "server-only";
import mongoose, { Schema, type HydratedDocument, type Model, type Types } from "mongoose";
import type { ExerciseType, WorkoutStatus } from "@/types/exercise";

export interface IWorkoutSet {
  setNumber: number;
  reps: number;
  durationSeconds?: number;
  completedAt?: Date;
}

export interface IWorkout {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  idempotencyKey: string;
  exerciseName: ExerciseType;
  status: WorkoutStatus;
  targetReps: number;
  targetSets: number;
  totalReps: number;
  totalSets: number;
  durationSeconds: number;
  startedAt: Date;
  completedAt?: Date;
  sets: IWorkoutSet[];
  exerciseMetrics?: Record<string, number | boolean | string>;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type WorkoutDocument = HydratedDocument<IWorkout>;

const workoutSetSchema = new Schema<IWorkoutSet>(
  {
    setNumber: { type: Number, required: true, min: 1, max: 50 },
    reps: { type: Number, required: true, min: 0, max: 500 },
    durationSeconds: { type: Number, min: 0, max: 28800 },
    completedAt: { type: Date },
  },
  { _id: false }
);

const workoutSchema = new Schema<IWorkout>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    idempotencyKey: {
      type: String,
      required: true,
      trim: true,
      maxlength: 128,
    },
    exerciseName: {
      type: String,
      enum: [
        "squats",
        "pushups",
        "biceps_curls",
        "shoulder_press",
        "lunges",
      ],
      required: true,
    },
    status: {
      type: String,
      enum: ["COMPLETED", "INTERRUPTED"],
      required: true,
    },
    targetReps: { type: Number, required: true, min: 1, max: 100 },
    targetSets: { type: Number, required: true, min: 1, max: 50 },
    totalReps: { type: Number, required: true, min: 0, max: 5000 },
    totalSets: { type: Number, required: true, min: 0, max: 50 },
    durationSeconds: { type: Number, required: true, min: 0, max: 28800 },
    startedAt: { type: Date, required: true },
    completedAt: { type: Date },
    sets: {
      type: [workoutSetSchema],
      default: [],
      validate: {
        validator: (items: IWorkoutSet[]) => items.length <= 50,
        message: "A workout cannot contain more than 50 sets",
      },
    },
    exerciseMetrics: {
      type: Schema.Types.Mixed,
      default: undefined,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    collection: "workouts",
  }
);

workoutSchema.index({ userId: 1, startedAt: -1 });
workoutSchema.index({ userId: 1, exerciseName: 1, startedAt: -1 });
workoutSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true });

export const WorkoutModel: Model<IWorkout> =
  (mongoose.models.Workout as Model<IWorkout> | undefined) ??
  mongoose.model<IWorkout>("Workout", workoutSchema);
