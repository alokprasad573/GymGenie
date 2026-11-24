import "server-only";
import mongoose, { Schema, type HydratedDocument, type Model, type Types } from "mongoose";

export interface IRefreshSession {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  sessionId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt?: Date | null;
  rotatedAt?: Date | null;
  replacedByTokenId?: Types.ObjectId | null;
  lastUsedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type RefreshSessionDocument = HydratedDocument<IRefreshSession>;

const refreshSessionSchema = new Schema<IRefreshSession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sessionId: {
      type: String,
      required: true,
    },
    tokenHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    rotatedAt: {
      type: Date,
      default: null,
    },
    replacedByTokenId: {
      type: Schema.Types.ObjectId,
      ref: "RefreshSession",
      default: null,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "refreshSessions",
  }
);

refreshSessionSchema.index({ tokenHash: 1 }, { unique: true });
refreshSessionSchema.index({ sessionId: 1 });
refreshSessionSchema.index({ userId: 1, sessionId: 1 });
// Retain expired sessions for 7 days post-expiry to support reuse-detection audit, then auto-purge.
refreshSessionSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 7 }
);

export const RefreshSessionModel: Model<IRefreshSession> =
  (mongoose.models.RefreshSession as Model<IRefreshSession> | undefined) ??
  mongoose.model<IRefreshSession>("RefreshSession", refreshSessionSchema);
