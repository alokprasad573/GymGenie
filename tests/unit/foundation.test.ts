import { describe, expect, it } from "vitest";
import { ZodError, z } from "zod";
import { parseServerEnv } from "@/lib/env";
import { formatLogEntry } from "@/lib/logger";
import { AppError, handleApiError } from "@/lib/errors";
import { EXERCISE_ORDER, EXERCISES, POSE_CONNECTIONS } from "@/config/exercises";

describe("Phase 1 Foundation", () => {
  describe("Environment validation", () => {
    it("accepts valid server configuration with defaults", () => {
      const env = parseServerEnv({
        NODE_ENV: "test",
        APP_URL: "http://localhost:3000",
        MONGODB_URI: "mongodb+srv://user:pass@cluster.example.net/gymgenie",
        JWT_ACCESS_SECRET: "a".repeat(32),
        JWT_REFRESH_SECRET: "b".repeat(32),
      });

      expect(env.JWT_ISSUER).toBe("gymgenie");
      expect(env.JWT_AUDIENCE).toBe("gymgenie-web");
      expect(env.GROQ_MODEL).toBe("llama-3.3-70b-versatile");
    });

    it("rejects short JWT secrets and invalid MongoDB URIs", () => {
      expect(() =>
        parseServerEnv({
          MONGODB_URI: "http://not-mongo",
          JWT_ACCESS_SECRET: "short",
          JWT_REFRESH_SECRET: "short",
        })
      ).toThrow(/Invalid server environment configuration/);
    });
  });

  describe("Structured logger redaction", () => {
    it("redacts secrets, tokens, cookies, and passwords", () => {
      const raw = formatLogEntry("info", "Auth attempt", {
        email: "athlete@example.com",
        password: "super-secret-password",
        accessToken: "jwt-token-value",
        refreshToken: "refresh-secret",
        cookie: "gg_access=abc",
        nested: { groq_api_key: "gsk_123" },
      });

      const parsed = JSON.parse(raw) as {
        meta: Record<string, unknown> & { nested: Record<string, unknown> };
      };
      expect(parsed.meta.email).toBe("athlete@example.com");
      expect(parsed.meta.password).toBe("[REDACTED]");
      expect(parsed.meta.accessToken).toBe("[REDACTED]");
      expect(parsed.meta.refreshToken).toBe("[REDACTED]");
      expect(parsed.meta.cookie).toBe("[REDACTED]");
      expect(parsed.meta.nested.groq_api_key).toBe("[REDACTED]");
    });
  });

  describe("Centralized API error handling", () => {
    it("formats AppError into standard envelope without stack traces", async () => {
      const response = handleApiError(
        new AppError("UNAUTHORIZED", "Authentication required", 401),
        "req-123"
      );
      expect(response.status).toBe(401);
      const body = (await response.json()) as {
        error: { code: string; message: string; requestId: string; stack?: string };
      };
      expect(body.error).toEqual({
        code: "UNAUTHORIZED",
        message: "Authentication required",
        requestId: "req-123",
      });
      expect(body.error.stack).toBeUndefined();
    });

    it("formats ZodError as 400 VALIDATION_ERROR", async () => {
      let caught: unknown;
      try {
        z.object({ targetReps: z.number().min(1) }).parse({ targetReps: 0 });
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(ZodError);
      const response = handleApiError(caught, "req-zod");
      expect(response.status).toBe(400);
      const body = (await response.json()) as { error: { code: string } };
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("masks unexpected errors as 500 INTERNAL_ERROR", async () => {
      const response = handleApiError(new Error("ECONNREFUSED mongodb://secret"), "req-500");
      expect(response.status).toBe(500);
      const body = (await response.json()) as { error: { code: string; message: string } };
      expect(body.error.code).toBe("INTERNAL_ERROR");
      expect(body.error.message).not.toContain("mongodb://");
    });
  });

  describe("Exercise configuration integrity", () => {
    it("preserves all five exercises and 18 pose connections", () => {
      expect(EXERCISE_ORDER).toEqual([
        "squats",
        "pushups",
        "biceps_curls",
        "shoulder_press",
        "lunges",
      ]);
      expect(Object.keys(EXERCISES)).toHaveLength(5);
      expect(POSE_CONNECTIONS).toHaveLength(18);
    });
  });
});
