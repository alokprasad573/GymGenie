import "server-only";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel, type IUser, type UserPreferences, type UserRole } from "@/models/User";
import { getMemoryStore } from "@/repositories/memory-store";

export interface PublicUser {
  id: string;
  username: string;
  displayUsername: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  role: UserRole;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface UserWithSecret extends PublicUser {
  passwordHash: string;
}

export function toPublicUser(doc: {
  _id: Types.ObjectId | string;
  username: string;
  displayUsername: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  role: UserRole;
  preferences?: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}): PublicUser {
  return {
    id: doc._id.toString(),
    username: doc.username,
    displayUsername: doc.displayUsername,
    email: doc.email,
    ...(doc.name ? { name: doc.name } : {}),
    ...(doc.avatarUrl ? { avatarUrl: doc.avatarUrl } : {}),
    role: doc.role,
    preferences: {
      enableVoice: doc.preferences?.enableVoice ?? true,
      enableAiCoaching: doc.preferences?.enableAiCoaching ?? true,
      defaultRestSeconds: doc.preferences?.defaultRestSeconds ?? 60,
    },
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export interface UserRepository {
  createUser(input: {
    username: string;
    displayUsername: string;
    email: string;
    passwordHash: string;
    name?: string;
  }): Promise<PublicUser>;
  findById(userId: string): Promise<PublicUser | null>;
  findByIdWithPassword(userId: string): Promise<UserWithSecret | null>;
  findByIdentifierWithPassword(identifier: string): Promise<UserWithSecret | null>;
  findByEmail(email: string): Promise<PublicUser | null>;
  existsByEmailOrUsername(email: string, username: string): Promise<{
    emailExists: boolean;
    usernameExists: boolean;
  }>;
  updateProfile(
    userId: string,
    updates: {
      name?: string;
      username?: string;
      displayUsername?: string;
      avatarUrl?: string;
      preferences?: Partial<UserPreferences>;
    }
  ): Promise<PublicUser | null>;
  updatePasswordHash(userId: string, passwordHash: string): Promise<boolean>;
  setPasswordResetToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date
  ): Promise<void>;
  findByValidResetTokenHash(tokenHash: string): Promise<PublicUser | null>;
  clearPasswordResetToken(userId: string): Promise<void>;
}

export const mongoUserRepository: UserRepository = {
  async createUser(input) {
    const db = await connectToDatabase();
    if (!db) return getMemoryStore().userRepo.createUser(input);
    const created = await UserModel.create({
      username: input.username.trim().toLowerCase(),
      displayUsername: input.displayUsername.trim(),
      email: input.email.trim().toLowerCase(),
      passwordHash: input.passwordHash,
      name: input.name?.trim() || undefined,
      role: "USER",
    });
    return toPublicUser(created);
  },

  async findById(userId) {
    const db = await connectToDatabase();
    if (!db) return getMemoryStore().userRepo.findById(userId);
    if (!Types.ObjectId.isValid(userId)) return null;
    const doc = await UserModel.findById(userId).lean<IUser>().exec();
    return doc ? toPublicUser(doc) : null;
  },

  async findByIdWithPassword(userId) {
    const db = await connectToDatabase();
    if (!db) return getMemoryStore().userRepo.findByIdWithPassword(userId);
    if (!Types.ObjectId.isValid(userId)) return null;
    const doc = await UserModel.findById(userId)
      .select("+passwordHash")
      .lean<IUser>()
      .exec();
    if (!doc) return null;
    return { ...toPublicUser(doc), passwordHash: doc.passwordHash };
  },

  async findByIdentifierWithPassword(identifier) {
    const db = await connectToDatabase();
    if (!db) return getMemoryStore().userRepo.findByIdentifierWithPassword(identifier);
    const normalized = identifier.trim().toLowerCase();
    const doc = await UserModel.findOne({
      $or: [{ email: normalized }, { username: normalized }],
    })
      .select("+passwordHash")
      .lean<IUser>()
      .exec();
    if (!doc) return null;
    return { ...toPublicUser(doc), passwordHash: doc.passwordHash };
  },

  async findByEmail(email) {
    const db = await connectToDatabase();
    if (!db) return getMemoryStore().userRepo.findByEmail(email);
    const doc = await UserModel.findOne({
      email: email.trim().toLowerCase(),
    })
      .lean<IUser>()
      .exec();
    return doc ? toPublicUser(doc) : null;
  },

  async existsByEmailOrUsername(email, username) {
    const db = await connectToDatabase();
    if (!db) return getMemoryStore().userRepo.existsByEmailOrUsername(email, username);
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim().toLowerCase();
    const existing = await UserModel.find({
      $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
    })
      .select("email username")
      .lean<Array<{ email: string; username: string }>>()
      .exec();

    return {
      emailExists: existing.some((u) => u.email === normalizedEmail),
      usernameExists: existing.some((u) => u.username === normalizedUsername),
    };
  },

  async updateProfile(userId, updates) {
    const db = await connectToDatabase();
    if (!db) return getMemoryStore().userRepo.updateProfile(userId, updates);
    if (!Types.ObjectId.isValid(userId)) return null;
    const setPayload: Record<string, unknown> = {};
    if (updates.name !== undefined) setPayload.name = updates.name;
    if (updates.username !== undefined) {
      setPayload.username = updates.username.trim().toLowerCase();
      setPayload.displayUsername =
        updates.displayUsername?.trim() ?? updates.username.trim();
    }
    if (updates.avatarUrl !== undefined) {
      setPayload.avatarUrl = updates.avatarUrl || undefined;
    }
    if (updates.preferences) {
      if (updates.preferences.enableVoice !== undefined) {
        setPayload["preferences.enableVoice"] = updates.preferences.enableVoice;
      }
      if (updates.preferences.enableAiCoaching !== undefined) {
        setPayload["preferences.enableAiCoaching"] =
          updates.preferences.enableAiCoaching;
      }
      if (updates.preferences.defaultRestSeconds !== undefined) {
        setPayload["preferences.defaultRestSeconds"] =
          updates.preferences.defaultRestSeconds;
      }
    }

    const updated = await UserModel.findByIdAndUpdate(
      userId,
      { $set: setPayload },
      { new: true, runValidators: true }
    )
      .lean<IUser>()
      .exec();
    return updated ? toPublicUser(updated) : null;
  },

  async updatePasswordHash(userId, passwordHash) {
    const db = await connectToDatabase();
    if (!db) return getMemoryStore().userRepo.updatePasswordHash(userId, passwordHash);
    if (!Types.ObjectId.isValid(userId)) return false;
    const result = await UserModel.updateOne(
      { _id: userId },
      {
        $set: {
          passwordHash,
          passwordResetTokenHash: null,
          passwordResetExpiresAt: null,
        },
      }
    ).exec();
    return result.matchedCount > 0;
  },

  async setPasswordResetToken(userId, tokenHash, expiresAt) {
    const db = await connectToDatabase();
    if (!db) return getMemoryStore().userRepo.setPasswordResetToken(userId, tokenHash, expiresAt);
    if (!Types.ObjectId.isValid(userId)) return;
    await UserModel.updateOne(
      { _id: userId },
      {
        $set: {
          passwordResetTokenHash: tokenHash,
          passwordResetExpiresAt: expiresAt,
        },
      }
    ).exec();
  },

  async findByValidResetTokenHash(tokenHash) {
    const db = await connectToDatabase();
    if (!db) return getMemoryStore().userRepo.findByValidResetTokenHash(tokenHash);
    const doc = await UserModel.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() },
    })
      .lean<IUser>()
      .exec();
    return doc ? toPublicUser(doc) : null;
  },

  async clearPasswordResetToken(userId) {
    const db = await connectToDatabase();
    if (!db) return getMemoryStore().userRepo.clearPasswordResetToken(userId);
    if (!Types.ObjectId.isValid(userId)) return;
    await UserModel.updateOne(
      { _id: userId },
      { $set: { passwordResetTokenHash: null, passwordResetExpiresAt: null } }
    ).exec();
  },
};
