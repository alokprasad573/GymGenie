// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { resetEnvCache } from "@/lib/env";
import { hashPassword, verifyPassword } from "@/lib/password";
import {
  hashOpaqueToken,
  signAccessToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "@/lib/jwt";
import { assertSameOriginRequest } from "@/lib/csrf";
import { checkRateLimit, resetRateLimitStore } from "@/lib/rate-limit";
import { updateProfileSchema } from "@/lib/validations/auth";
import { createAuthService } from "@/services/auth/auth.service";
import { createInMemoryTestRepositories } from "../helpers/in-memory-repos";

describe("Phase 3 & 4 — Auth, Sessions, Security, and Scoped Persistence", () => {
  beforeEach(() => {
    process.env.APP_URL = "http://localhost:3000";
    process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/gymgenie_test";
    process.env.JWT_ACCESS_SECRET = "test-access-secret-minimum-32-chars-ok";
    process.env.JWT_REFRESH_SECRET = "test-refresh-secret-minimum-32-chars-ok";
    process.env.JWT_ISSUER = "gymgenie";
    process.env.JWT_AUDIENCE = "gymgenie-web";
    resetEnvCache();
    resetRateLimitStore();
  });

  it("hashes and verifies passwords with Argon2id", async () => {
    const hash = await hashPassword("StrongPass123");
    expect(hash).toMatch(/^\$argon2id\$v=19\$m=65536,t=3,p=1\$/);
    expect(await verifyPassword("StrongPass123", hash)).toBe(true);
    expect(await verifyPassword("WrongPass123", hash)).toBe(false);
  });

  it("enforces separate signing secrets between access and refresh tokens", async () => {
    const access = await signAccessToken({
      userId: "user-1",
      role: "USER",
      sessionId: "sid-1",
    });

    const verified = await verifyAccessToken(access);
    expect(verified.sub).toBe("user-1");
    expect(verified.typ).toBe("access");

    await expect(verifyRefreshToken(access)).rejects.toThrow();
  });

  it("registers, rejects duplicates, logs in, and rejects wrong passwords", async () => {
    const repos = createInMemoryTestRepositories();
    const auth = createAuthService(repos);

    const registered = await auth.register({
      username: "AlokFit",
      email: "Alok@Example.com",
      password: "Password123",
      name: "Alok",
    });

    expect(registered.user.username).toBe("alokfit");
    expect(registered.user.displayUsername).toBe("AlokFit");
    expect(registered.user.email).toBe("alok@example.com");

    // Duplicate email rejected
    await expect(
      auth.register({
        username: "other_user",
        email: "alok@example.com",
        password: "Password123",
      })
    ).rejects.toMatchObject({ statusCode: 409, code: "CONFLICT" });

    // Duplicate username rejected
    await expect(
      auth.register({
        username: "ALOKFIT",
        email: "other@example.com",
        password: "Password123",
      })
    ).rejects.toMatchObject({ statusCode: 409, code: "CONFLICT" });

    // Login by email and username
    const loginByEmail = await auth.login({
      identifier: "alok@example.com",
      password: "Password123",
    });
    expect(loginByEmail.user.id).toBe(registered.user.id);

    const loginByUsername = await auth.login({
      identifier: "alokfit",
      password: "Password123",
    });
    expect(loginByUsername.user.id).toBe(registered.user.id);

    // Wrong password returns generic 401
    await expect(
      auth.login({
        identifier: "alok@example.com",
        password: "WrongPassword99",
      })
    ).rejects.toMatchObject({ statusCode: 401, code: "UNAUTHORIZED" });
  });

  it("rotates refresh tokens atomically and revokes session family on reuse", async () => {
    const repos = createInMemoryTestRepositories();
    const auth = createAuthService(repos);

    const { tokens: initialTokens } = await auth.register({
      username: "rotator",
      email: "rotator@example.com",
      password: "Password123",
    });

    // Ensure raw refresh token is never stored directly
    for (const s of repos.sessions.values()) {
      expect(s.tokenHash).not.toBe(initialTokens.refreshToken);
      expect(s.tokenHash).toBe(hashOpaqueToken(initialTokens.refreshToken));
    }

    // Rotate once
    const rotated = await auth.refresh(initialTokens.refreshToken);
    expect(rotated.tokens.refreshToken).not.toBe(initialTokens.refreshToken);

    // Replay the already-rotated token -> triggers reuse detection & revokes entire family
    await expect(auth.refresh(initialTokens.refreshToken)).rejects.toMatchObject({
      statusCode: 401,
    });

    // Even the newer rotated token from the compromised family is now revoked!
    await expect(auth.refresh(rotated.tokens.refreshToken)).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it("handles concurrent refresh attempts safely without double issuance", async () => {
    const repos = createInMemoryTestRepositories();
    const auth = createAuthService(repos);

    const { tokens } = await auth.register({
      username: "concurrent_u",
      email: "concurrent@example.com",
      password: "Password123",
    });

    const results = await Promise.allSettled([
      auth.refresh(tokens.refreshToken),
      auth.refresh(tokens.refreshToken),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
  });

  it("revokes session on logout and revokes all sessions on password change", async () => {
    const repos = createInMemoryTestRepositories();
    const auth = createAuthService(repos);

    const reg = await auth.register({
      username: "logout_u",
      email: "logout@example.com",
      password: "Password123",
    });

    await auth.logout(reg.tokens.refreshToken);
    await expect(auth.refresh(reg.tokens.refreshToken)).rejects.toMatchObject({
      statusCode: 401,
    });

    const login2 = await auth.login({
      identifier: "logout@example.com",
      password: "Password123",
    });

    const changed = await auth.changePassword(reg.user.id, {
      currentPassword: "Password123",
      newPassword: "NewPassword456",
    });

    // Old session revoked
    await expect(auth.refresh(login2.tokens.refreshToken)).rejects.toMatchObject({
      statusCode: 401,
    });

    // New session valid
    const refreshedNew = await auth.refresh(changed.tokens.refreshToken);
    expect(refreshedNew.user.id).toBe(reg.user.id);
  });

  it("blocks cross-site CSRF mutations and rejects mass-assignment fields", () => {
    const badReq = new NextRequest("http://localhost:3000/api/workouts", {
      method: "POST",
      headers: {
        origin: "https://evil.example.com",
        host: "localhost:3000",
      },
    });
    expect(() => assertSameOriginRequest(badReq)).toThrow(/Invalid request origin/);

    const goodReq = new NextRequest("http://localhost:3000/api/workouts", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        host: "localhost:3000",
      },
    });
    expect(() => assertSameOriginRequest(goodReq)).not.toThrow();

    // Mass assignment rejected by strict profile schema
    expect(() =>
      updateProfileSchema.parse({
        name: "Legit",
        role: "ADMIN",
      })
    ).toThrow();
  });

  it("enforces sliding-window rate limits", () => {
    const cfg = { bucket: "test:login", limit: 3, windowMs: 60_000 };
    const now = 1_000_000;
    expect(checkRateLimit("1.2.3.4", cfg, now).allowed).toBe(true);
    expect(checkRateLimit("1.2.3.4", cfg, now + 100).allowed).toBe(true);
    expect(checkRateLimit("1.2.3.4", cfg, now + 200).allowed).toBe(true);

    const fourth = checkRateLimit("1.2.3.4", cfg, now + 300);
    expect(fourth.allowed).toBe(false);
    expect(fourth.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("scopes workouts strictly to owning user and prevents duplicate idempotency writes", async () => {
    const repos = createInMemoryTestRepositories();
    const auth = createAuthService(repos);

    const userA = await auth.register({
      username: "user_a",
      email: "a@example.com",
      password: "Password123",
    });
    const userB = await auth.register({
      username: "user_b",
      email: "b@example.com",
      password: "Password123",
    });

    const payload = {
      idempotencyKey: "session-key-12345678",
      exerciseName: "squats" as const,
      status: "COMPLETED" as const,
      targetReps: 10,
      targetSets: 3,
      totalReps: 30,
      totalSets: 3,
      durationSeconds: 180,
      startedAt: new Date("2026-11-23T10:00:00Z").toISOString(),
      completedAt: new Date("2026-11-23T10:03:00Z").toISOString(),
      sets: [
        { setNumber: 1, reps: 10 },
        { setNumber: 2, reps: 10 },
        { setNumber: 3, reps: 10 },
      ],
    };

    const first = await repos.workoutRepo.createIdempotent(userA.user.id, payload);
    const second = await repos.workoutRepo.createIdempotent(userA.user.id, payload);

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.workout.id).toBe(first.workout.id);

    // Cross-user isolation: User B cannot read, update, or delete User A's workout
    expect(
      await repos.workoutRepo.findOwnedById(userB.user.id, first.workout.id)
    ).toBeNull();
    expect(
      await repos.workoutRepo.updateOwnedNotes(userB.user.id, first.workout.id, "hacked")
    ).toBeNull();
    expect(
      await repos.workoutRepo.deleteOwnedById(userB.user.id, first.workout.id)
    ).toBe(false);
  });
});
