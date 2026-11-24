import "server-only";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { RefreshSessionModel, type IRefreshSession } from "@/models/RefreshSession";
import { getMemoryStore } from "@/repositories/memory-store";

export interface RefreshSessionRecord {
  id: string;
  userId: string;
  sessionId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt?: Date | null;
  rotatedAt?: Date | null;
  replacedByTokenId?: string | null;
  lastUsedAt?: Date | null;
  createdAt: Date;
}

function toRecord(doc: IRefreshSession): RefreshSessionRecord {
  return {
    id: doc._id.toString(),
    userId: doc.userId.toString(),
    sessionId: doc.sessionId,
    tokenHash: doc.tokenHash,
    expiresAt: doc.expiresAt,
    revokedAt: doc.revokedAt ?? null,
    rotatedAt: doc.rotatedAt ?? null,
    replacedByTokenId: doc.replacedByTokenId?.toString() ?? null,
    lastUsedAt: doc.lastUsedAt ?? null,
    createdAt: doc.createdAt,
  };
}

export interface SessionRepository {
  createSession(input: {
    userId: string;
    sessionId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<RefreshSessionRecord>;
  claimActiveSessionForRotation(
    tokenHash: string,
    now: Date
  ): Promise<RefreshSessionRecord | null>;
  findByTokenHash(tokenHash: string): Promise<RefreshSessionRecord | null>;
  linkReplacement(oldId: string, newId: string): Promise<void>;
  revokeSessionByTokenHash(tokenHash: string, now: Date): Promise<void>;
  revokeSessionFamily(sessionId: string, now: Date): Promise<void>;
  revokeAllForUser(userId: string, now: Date): Promise<void>;
}

export const mongoSessionRepository: SessionRepository = {
  async createSession(input) {
    const db = await connectToDatabase();
    if (!db) return getMemoryStore().sessionRepo.createSession(input);
    const created = await RefreshSessionModel.create({
      userId: new Types.ObjectId(input.userId),
      sessionId: input.sessionId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
    });
    return toRecord(created);
  },

  async claimActiveSessionForRotation(tokenHash, now) {
    const db = await connectToDatabase();
    if (!db) return getMemoryStore().sessionRepo.claimActiveSessionForRotation(tokenHash, now);
    const claimed = await RefreshSessionModel.findOneAndUpdate(
      {
        tokenHash,
        revokedAt: null,
        rotatedAt: null,
        expiresAt: { $gt: now },
      },
      {
        $set: {
          rotatedAt: now,
          lastUsedAt: now,
        },
      },
      { new: true }
    )
      .lean<IRefreshSession>()
      .exec();

    return claimed ? toRecord(claimed) : null;
  },

  async findByTokenHash(tokenHash) {
    const db = await connectToDatabase();
    if (!db) return getMemoryStore().sessionRepo.findByTokenHash(tokenHash);
    const doc = await RefreshSessionModel.findOne({ tokenHash })
      .lean<IRefreshSession>()
      .exec();
    return doc ? toRecord(doc) : null;
  },

  async linkReplacement(oldId, newId) {
    const db = await connectToDatabase();
    if (!db) return getMemoryStore().sessionRepo.linkReplacement(oldId, newId);
    if (!Types.ObjectId.isValid(oldId) || !Types.ObjectId.isValid(newId)) return;
    await RefreshSessionModel.updateOne(
      { _id: new Types.ObjectId(oldId) },
      { $set: { replacedByTokenId: new Types.ObjectId(newId) } }
    ).exec();
  },

  async revokeSessionByTokenHash(tokenHash, now) {
    const db = await connectToDatabase();
    if (!db) return getMemoryStore().sessionRepo.revokeSessionByTokenHash(tokenHash, now);
    const existing = await RefreshSessionModel.findOne({ tokenHash })
      .select("sessionId")
      .lean<{ sessionId: string }>()
      .exec();
    if (!existing) return;
    await RefreshSessionModel.updateMany(
      { sessionId: existing.sessionId, revokedAt: null },
      { $set: { revokedAt: now } }
    ).exec();
  },

  async revokeSessionFamily(sessionId, now) {
    const db = await connectToDatabase();
    if (!db) return getMemoryStore().sessionRepo.revokeSessionFamily(sessionId, now);
    await RefreshSessionModel.updateMany(
      { sessionId, revokedAt: null },
      { $set: { revokedAt: now } }
    ).exec();
  },

  async revokeAllForUser(userId, now) {
    const db = await connectToDatabase();
    if (!db) return getMemoryStore().sessionRepo.revokeAllForUser(userId, now);
    if (!Types.ObjectId.isValid(userId)) return;
    await RefreshSessionModel.updateMany(
      { userId: new Types.ObjectId(userId), revokedAt: null },
      { $set: { revokedAt: now } }
    ).exec();
  },
};
