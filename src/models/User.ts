import "server-only";
import mongoose, { Schema, type HydratedDocument, type Model, type Types } from "mongoose";

export type UserRole = "USER" | "ADMIN";

export interface UserPreferences {
  enableVoice: boolean;
  enableAiCoaching: boolean;
  defaultRestSeconds: number;
}

export interface IUser {
  _id: Types.ObjectId;
  username: string;
  displayUsername: string;
  email: string;
  passwordHash: string;
  name?: string;
  avatarUrl?: string;
  role: UserRole;
  preferences: UserPreferences;
  passwordResetTokenHash?: string | null;
  passwordResetExpiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<IUser>;

const userPreferencesSchema = new Schema<UserPreferences>(
  {
    enableVoice: { type: Boolean, default: true },
    enableAiCoaching: { type: Boolean, default: true },
    defaultRestSeconds: { type: Number, default: 60, min: 0, max: 600 },
  },
  { _id: false }
);

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 32,
    },
    displayUsername: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 32,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    name: {
      type: String,
      trim: true,
      maxlength: 80,
    },
    avatarUrl: {
      type: String,
      trim: true,
      maxlength: 512,
    },
    role: {
      type: String,
      enum: ["USER", "ADMIN"],
      default: "USER",
      required: true,
    },
    preferences: {
      type: userPreferencesSchema,
      default: () => ({
        enableVoice: true,
        enableAiCoaching: true,
        defaultRestSeconds: 60,
      }),
    },
    passwordResetTokenHash: {
      type: String,
      default: null,
      select: false,
    },
    passwordResetExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },
  },
  {
    timestamps: true,
    collection: "users",
  }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ passwordResetTokenHash: 1 }, { sparse: true });

export const UserModel: Model<IUser> =
  (mongoose.models.User as Model<IUser> | undefined) ??
  mongoose.model<IUser>("User", userSchema);
