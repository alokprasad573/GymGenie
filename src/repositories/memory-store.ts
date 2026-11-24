import "server-only";
import crypto from "node:crypto";
import type { PublicUser, UserRepository, UserWithSecret } from "@/repositories/user.repository";
import type { RefreshSessionRecord, SessionRepository } from "@/repositories/session.repository";
import type { PaginatedWorkouts, WorkoutDTO, WorkoutRepository } from "@/repositories/workout.repository";
import type { CreateWorkoutInput, ListWorkoutsQuery } from "@/lib/validations/workout";
import type { UserPreferences } from "@/models/User";

interface StoredUser extends UserWithSecret {
  passwordResetTokenHash?: string | null;
  passwordResetExpiresAt?: Date | null;
}

export interface MemoryStoreInstance {
  users: Map<string, StoredUser>;
  sessions: Map<string, RefreshSessionRecord>;
  workouts: Map<string, WorkoutDTO>;
  userRepo: UserRepository;
  sessionRepo: SessionRepository;
  workoutRepo: WorkoutRepository;
}

declare global {
  var __gymgenieMemoryStore: MemoryStoreInstance | undefined;
}

function createMemoryStoreInstance(): MemoryStoreInstance {
  const users = new Map<string, StoredUser>();
  const sessions = new Map<string, RefreshSessionRecord>();
  const workouts = new Map<string, WorkoutDTO>();

  const toPublic = (u: StoredUser): PublicUser => {
    const {
      passwordHash: _ph,
      passwordResetTokenHash: _rth,
      passwordResetExpiresAt: _rte,
      ...pub
    } = u;
    return { ...pub, preferences: { ...pub.preferences } };
  };

  const userRepo: UserRepository = {
    async createUser(input) {
      const id = crypto.randomBytes(12).toString("hex");
      const now = new Date().toISOString();
      const record: StoredUser = {
        id,
        username: input.username.trim().toLowerCase(),
        displayUsername: input.displayUsername.trim(),
        email: input.email.trim().toLowerCase(),
        passwordHash: input.passwordHash,
        ...(input.name ? { name: input.name } : {}),
        role: "USER",
        preferences: {
          enableVoice: true,
          enableAiCoaching: true,
          defaultRestSeconds: 60,
        },
        createdAt: now,
        updatedAt: now,
      };
      users.set(id, record);
      return toPublic(record);
    },

    async findById(userId) {
      const u = users.get(userId);
      return u ? toPublic(u) : null;
    },

    async findByIdWithPassword(userId) {
      const u = users.get(userId);
      return u ? { ...toPublic(u), passwordHash: u.passwordHash } : null;
    },

    async findByIdentifierWithPassword(identifier) {
      const norm = identifier.trim().toLowerCase();
      for (const u of users.values()) {
        if (u.email === norm || u.username === norm) {
          return { ...toPublic(u), passwordHash: u.passwordHash };
        }
      }
      return null;
    },

    async findByEmail(email) {
      const norm = email.trim().toLowerCase();
      for (const u of users.values()) {
        if (u.email === norm) return toPublic(u);
      }
      return null;
    },

    async existsByEmailOrUsername(email, username) {
      const normEmail = email.trim().toLowerCase();
      const normUser = username.trim().toLowerCase();
      let emailExists = false;
      let usernameExists = false;
      for (const u of users.values()) {
        if (normEmail && u.email === normEmail) emailExists = true;
        if (normUser && u.username === normUser) usernameExists = true;
      }
      return { emailExists, usernameExists };
    },

    async updateProfile(userId, updates) {
      const u = users.get(userId);
      if (!u) return null;
      if (updates.name !== undefined) u.name = updates.name;
      if (updates.username !== undefined) {
        u.username = updates.username.trim().toLowerCase();
        u.displayUsername = updates.displayUsername ?? updates.username.trim();
      }
      if (updates.avatarUrl !== undefined) {
        u.avatarUrl = updates.avatarUrl || undefined;
      }
      if (updates.preferences) {
        u.preferences = {
          ...u.preferences,
          ...(updates.preferences as Partial<UserPreferences>),
        };
      }
      u.updatedAt = new Date().toISOString();
      return toPublic(u);
    },

    async updatePasswordHash(userId, passwordHash) {
      const u = users.get(userId);
      if (!u) return false;
      u.passwordHash = passwordHash;
      u.passwordResetTokenHash = null;
      u.passwordResetExpiresAt = null;
      u.updatedAt = new Date().toISOString();
      return true;
    },

    async setPasswordResetToken(userId, tokenHash, expiresAt) {
      const u = users.get(userId);
      if (!u) return;
      u.passwordResetTokenHash = tokenHash;
      u.passwordResetExpiresAt = expiresAt;
    },

    async findByValidResetTokenHash(tokenHash) {
      const now = Date.now();
      for (const u of users.values()) {
        if (
          u.passwordResetTokenHash === tokenHash &&
          u.passwordResetExpiresAt &&
          u.passwordResetExpiresAt.getTime() > now
        ) {
          return toPublic(u);
        }
      }
      return null;
    },

    async clearPasswordResetToken(userId) {
      const u = users.get(userId);
      if (!u) return;
      u.passwordResetTokenHash = null;
      u.passwordResetExpiresAt = null;
    },
  };

  const sessionRepo: SessionRepository = {
    async createSession(input) {
      const id = crypto.randomBytes(12).toString("hex");
      const rec: RefreshSessionRecord = {
        id,
        userId: input.userId,
        sessionId: input.sessionId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        revokedAt: null,
        rotatedAt: null,
        replacedByTokenId: null,
        lastUsedAt: null,
        createdAt: new Date(),
      };
      sessions.set(id, rec);
      return { ...rec };
    },

    async claimActiveSessionForRotation(tokenHash, now) {
      for (const rec of sessions.values()) {
        if (
          rec.tokenHash === tokenHash &&
          rec.revokedAt === null &&
          rec.rotatedAt === null &&
          rec.expiresAt.getTime() > now.getTime()
        ) {
          rec.rotatedAt = now;
          rec.lastUsedAt = now;
          return { ...rec };
        }
      }
      return null;
    },

    async findByTokenHash(tokenHash) {
      for (const rec of sessions.values()) {
        if (rec.tokenHash === tokenHash) return { ...rec };
      }
      return null;
    },

    async linkReplacement(oldId, newId) {
      const rec = sessions.get(oldId);
      if (rec) rec.replacedByTokenId = newId;
    },

    async revokeSessionByTokenHash(tokenHash, now) {
      let targetFamily: string | null = null;
      for (const rec of sessions.values()) {
        if (rec.tokenHash === tokenHash) {
          targetFamily = rec.sessionId;
          break;
        }
      }
      if (!targetFamily) return;
      for (const rec of sessions.values()) {
        if (rec.sessionId === targetFamily && rec.revokedAt === null) {
          rec.revokedAt = now;
        }
      }
    },

    async revokeSessionFamily(sessionId, now) {
      for (const rec of sessions.values()) {
        if (rec.sessionId === sessionId && rec.revokedAt === null) {
          rec.revokedAt = now;
        }
      }
    },

    async revokeAllForUser(userId, now) {
      for (const rec of sessions.values()) {
        if (rec.userId === userId && rec.revokedAt === null) {
          rec.revokedAt = now;
        }
      }
    },
  };

  const workoutRepo: WorkoutRepository = {
    async createIdempotent(userId: string, input: CreateWorkoutInput) {
      for (const w of workouts.values()) {
        if (w.userId === userId && w.idempotencyKey === input.idempotencyKey) {
          return { workout: { ...w }, created: false };
        }
      }
      const id = crypto.randomBytes(12).toString("hex");
      const now = new Date().toISOString();
      const created: WorkoutDTO = {
        id,
        userId,
        idempotencyKey: input.idempotencyKey,
        exerciseName: input.exerciseName,
        status: input.status,
        targetReps: input.targetReps,
        targetSets: input.targetSets,
        totalReps: input.totalReps,
        totalSets: input.totalSets,
        durationSeconds: input.durationSeconds,
        startedAt: input.startedAt,
        ...(input.completedAt ? { completedAt: input.completedAt } : {}),
        sets: input.sets,
        ...(input.exerciseMetrics ? { exerciseMetrics: input.exerciseMetrics } : {}),
        ...(input.notes ? { notes: input.notes } : {}),
        createdAt: now,
        updatedAt: now,
      };
      workouts.set(id, created);
      return { workout: { ...created }, created: true };
    },

    async listForUser(userId: string, query: ListWorkoutsQuery): Promise<PaginatedWorkouts> {
      const filtered = Array.from(workouts.values())
        .filter((w) => {
          if (w.userId !== userId) return false;
          if (query.exercise && w.exerciseName !== query.exercise) return false;
          if (query.status && w.status !== query.status) return false;
          if (query.from && new Date(w.startedAt) < new Date(query.from)) return false;
          if (query.to && new Date(w.startedAt) > new Date(query.to)) return false;
          return true;
        })
        .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

      const total = filtered.length;
      const start = (query.page - 1) * query.limit;
      return {
        items: filtered.slice(start, start + query.limit),
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      };
    },

    async findOwnedById(userId, workoutId) {
      const w = workouts.get(workoutId);
      if (!w || w.userId !== userId) return null;
      return { ...w };
    },

    async updateOwnedNotes(userId, workoutId, notes) {
      const w = workouts.get(workoutId);
      if (!w || w.userId !== userId) return null;
      w.notes = notes ?? "";
      w.updatedAt = new Date().toISOString();
      return { ...w };
    },

    async deleteOwnedById(userId, workoutId) {
      const w = workouts.get(workoutId);
      if (!w || w.userId !== userId) return false;
      workouts.delete(workoutId);
      return true;
    },

    async listForUserInRange(userId, from, to) {
      return Array.from(workouts.values())
        .filter((w) => {
          if (w.userId !== userId) return false;
          const t = new Date(w.startedAt).getTime();
          return t >= from.getTime() && t <= to.getTime();
        })
        .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    },

    async listAllDatesForUser(userId, limit = 365) {
      return Array.from(workouts.values())
        .filter((w) => w.userId === userId)
        .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
        .slice(0, limit)
        .map((w) => new Date(w.startedAt));
    },
  };

  return {
    users,
    sessions,
    workouts,
    userRepo,
    sessionRepo,
    workoutRepo,
  };
}

export function getMemoryStore(): MemoryStoreInstance {
  if (!globalThis.__gymgenieMemoryStore) {
    globalThis.__gymgenieMemoryStore = createMemoryStoreInstance();
  }
  return globalThis.__gymgenieMemoryStore;
}
